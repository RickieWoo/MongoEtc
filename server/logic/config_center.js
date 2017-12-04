/**
 * Created by feix on 2017/3/6.
 */

let _ = require('underscore');
let winston = require("winston");
let compareVersions = require('compare-versions');
let defines = require('../conf/defines');
let utils = require('../utils/utils');
let ConfigDB = require('../models/config/config_db');
const debug = require('debug')('CONFIG_CENTER');

let AppType = defines.AppType;
let UserType = defines.UserType;
let PlatformType = defines.PlatformType;

class ConfigCenter {
    constructor() {
        this.logger = winston.loggers.get('ConfigCenterLogger');
        this.validItemNameSet = new Set();
        this.appConfigs = new Map();
        this.gameConfigs = new Map();
        this.serviceConfigs = new Map();
        this.userTypeKeyList = [...Object.values(UserType)];
        this.availableAttributeFieldsToResponse = new Set(['ads_display_config', 'native_ads_config',
            'interstitial_ads_config', 'video_config', 'ow_config',
            'switchers_config', 'ui_params_config', 'main_feed_display_config', 'misc_config', 'cards_config',
            'bonus_config', 'iap_config', 'shop_config']);
        this.availableAttributeFieldsOfApp = new Set([...this.availableAttributeFieldsToResponse,
            'app_info_config', 'review_version', 'level_config']);

        this.configDB = new ConfigDB({
            useDevDB: utils.isDevServer()
        });
        this.logger.info('[ConfigCenterLogger]Config db initiated! env => ', process.env.NODE_ENV);
    }

    checkIsInReview(clientName, clientVersion) {
        if (this.appConfigs.has(clientName)) {
            let appConfig = this.appConfigs.get(clientName);
            if (typeof appConfig.review_version === 'string') {
                return (compareVersions(JSON.parse(appConfig.review_version).version || '0', String(clientVersion || '0')) <= 0);
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }

    loadConfigFromDB() {
        return new Promise((resolve, reject) => {
            this.validItemNameSet.clear();
            this.configDB.scanConfigs()
                .then(result => {
                    this._onLoadingConfigFromDB(result, resolve, reject);
                })
                .catch(reason => {
                    reject(reason);
                });
        })
    }

    _onLoadingConfigFromDB(queryResult, resolve, reject) {
        let data = queryResult.Items;
        for (let configItem of data) {
            this.validItemNameSet.add(configItem.item_name);
            if (!this._checkIsValidLatestConfig(configItem)) {
                continue;
            }

            let itemType = configItem.item_type;
            if (itemType === 'app') {
                // 这里的configItem都是JSON字符串格式， 这里不要提前JSON.parse，
                // 因为每次取配置都需要使用JSON.parse实现深拷贝，生成新的Object，方便修改
                this.appConfigs.set(configItem.item_name, configItem);
            }
            else if (itemType === 'game') {
                for (let [key, value] of Object.entries(configItem)) {
                    try {
                        configItem[key] = JSON.parse(value);
                    }
                    catch (e) {
                        // do nothing
                    }
                }
                this.gameConfigs.set(configItem.item_name, configItem);
            }
            else if (itemType === 'service') {
                for (let [key, value] of Object.entries(configItem)) {
                    try {
                        configItem[key] = JSON.parse(value);
                    }
                    catch (e) {
                        // do nothing
                    }
                }
                this.serviceConfigs.set(configItem.item_name, configItem);
            }
        }

        if (queryResult.LastEvaluatedKey !== undefined) {
            param.ExclusiveStartKey = queryResult.LastEvaluatedKey;
            this.configDB.scanConfigs({
                ExclusiveStartKey: queryResult.LastEvaluatedKey
            }).then(result => {
                this._onLoadingConfigFromDB(result, resolve, reject);
            }).catch(error => reject(error))
        }
        else {
            for (let itemName of this.appConfigs.keys()) {
                if (!this.validItemNameSet.has(itemName)) {
                    this.appConfigs.delete(itemName);
                }
            }
            for (let itemName of this.serviceConfigs.keys()) {
                if (!this.validItemNameSet.has(itemName)) {
                    this.serviceConfigs.delete(itemName);
                }
            }
            for (let itemName of this.gameConfigs.keys()) {
                if (!this.validItemNameSet.has(itemName)) {
                    this.gameConfigs.delete(itemName);
                }
            }

            resolve(this.appConfigs.size + this.gameConfigs.size + this.serviceConfigs.size);
        }
    }

    checkIsAppConfigExist(clientName) {
        return this.appConfigs.has(clientName);
    }

    getAppConfig(queryParams) {
        let clientName = queryParams.client_name;
        if (queryParams.client_version === undefined) {
            queryParams.client_version = '1.0';
        }
        let sourceAppConfig = {};
        if (this.appConfigs.has(clientName)) {
            sourceAppConfig = this.appConfigs.get(clientName);
        }
        else {
            return undefined;
        }
        let appInfoConfig = JSON.parse(sourceAppConfig.app_info_config);
        let appType = appInfoConfig.app_type;
        let platform = appInfoConfig.platform;
        let defaultAppConfig = this._getDefaultAppConfig(appType, platform);

        let parsedAppConfig = {};
        let userTypeKey;
        if (queryParams.user) {
            userTypeKey = queryParams.user.user_type;
        }
        let defaultUserTypeKey = UserType.DEFAULT_USER;

        for (let configName of this.availableAttributeFieldsOfApp) {
            let oneConfigItem;
            try {
                if (configName in sourceAppConfig) {
                    oneConfigItem = JSON.parse(sourceAppConfig[configName]);
                }
                else if (configName in defaultAppConfig) {
                    oneConfigItem = JSON.parse(defaultAppConfig[configName]);
                }
            }
            catch (e) {
                continue;
            }

            if (oneConfigItem === undefined) {
                continue;
            }

            let userDefinedConfigItem;
            if (userTypeKey in oneConfigItem) {
                userDefinedConfigItem = oneConfigItem[userTypeKey];
            }
            else if (defaultUserTypeKey in oneConfigItem) {
                userDefinedConfigItem = oneConfigItem[userTypeKey];
            }
            if (userDefinedConfigItem) {
                for (let [k, v] of Object.entries(userDefinedConfigItem)) {
                    oneConfigItem[k] = v
                }
            }
            this.userTypeKeyList.map(key => delete oneConfigItem[key]);

            parsedAppConfig[configName] = oneConfigItem;
        }

        this._translateConfigItemSyntax(parsedAppConfig, queryParams);

        return parsedAppConfig;
    }

    getBasicAppInfoConfig(clientName, clientVersion) {
        let appInfoConfig = {};
        if (this.appConfigs.has(clientName)) {
            try {
                appInfoConfig = JSON.parse(this.appConfigs.get(clientName).app_info_config);
                if (clientVersion) {
                    this._translateConfigItemSyntax(appInfoConfig, {
                        client_version: clientVersion
                    })
                }
            }
            catch (error) {
                // do nothing
            }
        }
        return appInfoConfig;
    }

    getBaseCoins(params) {
        let clientName = params.client_name;
        let clientVersion = params.client_version;
        let user = params.user;
        let baseCoins = 7500;
        if (!clientName && user.platform && user.user_id) {
            clientName = `${user.platform}_${user.user_id.split('_')[0]}`
        }
        let baseAppInfoConfig = this.getBasicAppInfoConfig(clientName, clientVersion);
        if (baseAppInfoConfig && baseAppInfoConfig.base_coins) {
            baseCoins = baseAppInfoConfig.base_coins;
        }
        return baseCoins;
    }

    getGameConfig(clientName, gameID) {
        let [platform, appName] = clientName.split('_');
        let gameConfig;
        if (this.gameConfigs.has(gameID + '_' + appName)) {
            gameConfig = this.gameConfigs.get(gameID + '_' + appName);
        }
        else if (this.gameConfigs.has(gameID + '_' + platform)) {
            gameConfig = this.gameConfigs.get(gameID + '_' + platform);
        }
        else if (this.gameConfigs.has(gameID)) {
            gameConfig = this.gameConfigs.get(gameID);
        }
        return gameConfig;
    }

    getServiceConfig(itemName) {
        return this.serviceConfigs.get(itemName);
    }

    _getDefaultAppConfig(appType, platform) {
        let defaultConfig;
        if (platform === PlatformType.Android) {
            if (appType === AppType.XUANCAI) {
                defaultConfig = this.appConfigs.get('Android_DefaultXuancai');
            }
            else {
                defaultConfig = this.appConfigs.get('Android_DefaultClassic');
            }
        }
        else {
            if (appType === AppType.XUANCAI) {
                defaultConfig = this.appConfigs.get('iOS_DefaultXuancai');
            }
            else {
                defaultConfig = this.appConfigs.get('iOS_DefaultClassic');
            }
        }
        return defaultConfig;
    }

    _checkIsValidLatestConfig(item) {
        let itemType = item.item_type;
        if (itemType === 'app') {
            let clientName = item.item_name;
            if (clientName) {
                let existedConfig = this.appConfigs.get(clientName);
                if (existedConfig === undefined || existedConfig.update_timestamp === undefined
                    || existedConfig.update_timestamp !== item.update_timestamp) {
                    return true;
                }
            }
        }
        else if (itemType === 'game') {
            let existedConfig = this.gameConfigs.get(item.item_name);
            if (existedConfig === undefined || existedConfig.update_timestamp === undefined
                || existedConfig.update_timestamp !== item.update_timestamp) {
                return true;
            }
        }
        else if (itemType === 'service') {
            let existedConfig = this.serviceConfigs.get(item.item_name);
            if (existedConfig === undefined || existedConfig.update_timestamp === undefined
                || existedConfig.update_timestamp !== item.update_timestamp) {
                return true;
            }
        }
        return false;
    }

    _translateConfigItemSyntax(sourceConfigItem, queryParams) {
        let retranslate = false;
        for (let [key, value] of Object.entries(sourceConfigItem)) {
            if (key.startsWith('__version') && (typeof value === 'object' && !Array.isArray(value))) {
                let clientVersion = queryParams.client_version;
                let keyStringList = key.split('__');
                if (keyStringList.length === 3) {
                    let targetVersionRange = keyStringList[2];
                    let versionList = targetVersionRange.split(',');
                    if (versionList.length === 2) {
                        versionList.map((version, index) => versionList[index] = version.trim());
                        let leftVersion = versionList[0];
                        let leftComparator = leftVersion[0];
                        leftVersion = leftVersion.substr(1);
                        if ((leftComparator === '(' && compareVersions(clientVersion, leftVersion) > 0)
                            || (leftComparator === '[') && compareVersions(clientVersion, leftVersion) >= 0) {
                            let rightVersion = versionList[1];
                            let rightComparator = rightVersion[rightVersion.length - 1];
                            rightVersion = rightVersion.substr(0, rightVersion.length - 1);
                            if ((rightComparator === ')' && compareVersions(clientVersion, rightVersion) < 0)
                                || (rightComparator === ']') && compareVersions(clientVersion, rightVersion) <= 0) {
                                for (let [subKey, subValue] of Object.entries(value)) {
                                    sourceConfigItem[subKey] = subValue;
                                }
                                retranslate = true;
                            }
                        }
                    }

                    delete  sourceConfigItem[key];
                }
            }
            else if (key === '__pool__') {
                let poolKeys = value['__keys__'];
                let poolValues = value['__values__'];

                if (Array.isArray(poolKeys) && Array.isArray(poolValues) && poolKeys.length <= poolValues.length) {
                    poolKeys.forEach(propertyKey => {
                        poolValues = _.shuffle(poolValues);
                        sourceConfigItem[propertyKey] = poolValues.pop();
                        retranslate = true;
                    });

                    delete sourceConfigItem[key];
                }
            }
            else if (key.includes('=>')) {
                let syntaxList = key.split('=>');
                if (syntaxList.length > 1) {
                    let hasMatchedResult = false;
                    for (let syntaxIndex = 1; syntaxIndex !== syntaxList.length; ++syntaxIndex) {
                        let oneSyntax = syntaxList[syntaxIndex];
                        if (oneSyntax === 'random') {
                            if (Array.isArray(value)) {
                                value = _.sample(value, 1);
                                if (value.length) {
                                    value = value[0];
                                    hasMatchedResult = true;
                                }
                            }
                        } else if (oneSyntax.startsWith('sample')) {
                            if (Array.isArray(value)) {
                                let randomCount = parseInt(oneSyntax.substr('sample'.length));
                                if (isNaN(randomCount)) {
                                    randomCount = 1;
                                }
                                value = _.sample(value, randomCount);
                                if (value.length) {
                                    hasMatchedResult = true;
                                }
                            }
                        } else if (oneSyntax === 'distribute') {
                            if (typeof value === 'object') {
                                let hitRandomRate = Math.random();
                                debug(`[syntax => distribute] hit random rate => ${hitRandomRate}`);
                                let sum = 0;
                                for (let [distributeKey, distributeValue] of Object.entries(value)) {
                                    sum += parseFloat(distributeKey);
                                    if (hitRandomRate < sum) {
                                        value = distributeValue;
                                        hasMatchedResult = true;
                                        break;
                                    }
                                }
                            }
                        } else if (oneSyntax.startsWith('version')) {
                            if (typeof value === 'object') {
                                let clientVersion = queryParams.client_version;
                                for (let [distributeVersionRange, distributeValue] of Object.entries(value)) {
                                    let versionList = distributeVersionRange.split(',');
                                    if (versionList.length === 2) {
                                        versionList.map((version, index) => versionList[index] = version.trim());
                                        let leftVersion = versionList[0];
                                        let leftComparator = leftVersion[0];
                                        leftVersion = leftVersion.substr(1);
                                        if ((leftComparator === '(' && compareVersions(clientVersion, leftVersion) > 0)
                                            || (leftComparator === '[') && compareVersions(clientVersion, leftVersion) >= 0) {
                                            let rightVersion = versionList[1];
                                            let rightComparator = rightVersion[rightVersion.length - 1];
                                            rightVersion = rightVersion.substr(0, rightVersion.length - 1);
                                            if ((rightComparator === ')' && compareVersions(clientVersion, rightVersion) < 0)
                                                || (rightComparator === ']') && compareVersions(clientVersion, rightVersion) <= 0) {
                                                value = distributeValue;
                                                hasMatchedResult = true;
                                                break
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    delete sourceConfigItem[key];
                    if (hasMatchedResult) {
                        sourceConfigItem[syntaxList[0]] = value;
                        retranslate = true;
                    }
                }
            }
            else if (typeof value === 'object' && !Array.isArray(value)) {
                this._translateConfigItemSyntax(value, queryParams);
            }

            if (retranslate) {
                break
            }
        }

        if (retranslate) {
            this._translateConfigItemSyntax(sourceConfigItem, queryParams);
        }
    }
}

module.exports = (function () {
    let instance;

    return {
        getInstance: function () {
            if (!instance) {
                instance = new ConfigCenter();
            }
            return instance;
        }
    };
})();



