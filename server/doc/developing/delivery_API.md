# delivery

改模块的作用主要是用于接受订单及发货。

接口分为以下几个部分:

+ 接收订单，机器初筛分类
+ 查询未处理订单
+ 修改订单分类
+ 发货

下面分别说明这几个接口

## 接收订单

### HTTP Method

```
[POST]
```

### Path

```
/delivery/makeorder
```

### PostBody

| 字段   | 数据类型|说明|样例|是否必需|
|:--------:|:---------:|:-------:|:-:|:-------:|
| order_type | string| 订单类型, redeem/cranemachine/vip |"redeem"|是|
| user_id | string| 用户ID |"GiftGame_xxxxxxxxxx"|是|
| country_code | string| 国家码|"US"|是|
| client_name | string| 客户端名|"iOS_GiftGame"|是|
| client_version | string| 客户端版本 |"1.0"|是|
| ip | string| 兑卡时请求的IP |"x.x.x.x"|order_type为"vip"时不必需，其他情况必需|
| item | object| 兑卡时商品信息 | 略 |order_type为"vip"时不必需，其他情况必需|
| price | number | 兑卡时消耗金币数 | 10000 |是|
| exchange_rate | number | $1对应的金币数 | 7500 |order_type为"vip"时必需，其他情况不必需|
| sku | string| 兑换货物库存标识 |"amazon_us_1"|是|
| email | string| 兑换人邮箱，用于发货|"xxx@gmail.com"|是|

示例：

```JSON
{
    "order_type": "redeem",
    "user_id": "GiftTest_1234567890",
    "country_code": "US",
    "client_name": "iOS_GiftTest",
    "client_version": "1.0",
    "ip": "10.10.10.10",
    "item": {
        "country": "us",
        "app_type": "xuancai",
        "filter_key": "100000_us",
        "type": "amazon",
        "worth": "$0.1",
        "game_price": "10000",
        "update_timestamp": 1502873761306,
        "district": "us",
        "name": "Gift Card $0.1",
        "sku": "100000_amazon_us_0.1",
        "update_date_time": "2017-08-16 08:56:01",
        "base_coins": 100000,
        "status": "online",
        "price": "10000"
    },
    "price": 7500,
    "sku": "amazon_gb_1",
    "email": "test@pinssible.com"
}
```

### Response

JsonSchema:

```JAVASCRIPT
{
	type: 'object',
	properties: {
		order: {
			type: 'object',
			required: ['user_id', 'order_id'],
			properties: {
			    user_id: {type: 'string'},
			    order_id: {type: 'integer'},
			    status: {type: 'string'},
			    result: {type: 'string'},
			    reason: {type: 'string'}
			}
		}
	}
}
```

字段说明:

| 字段   | 数据类型|          说明         |
|:--------:|:---------:|:-----------------:|
| order.user_id | string | 用户ID |
| order.order_id | integer | 订单号(也为订单生成时间戳) |
| status | string| 状态，通常为"ongoing" |
| result | string| 订单判定结果 ok/doubtful/cheated |
| reason | string| 机筛初步结果 |

样例：

```json
{
    order: {
        user_id: "GiftTest_1234567890",
        order_id: 1502955404738,
        status: "ongoing",
        result: "ok"
    }
}
```

错误码：

| 错误码   | 说明|
|:-------:|:-------:|
| 600 | 订单格式无效 |
| 902 | 用户session失效，重新登录 |

## 查询未处理订单接口

### HTTP Method

```
[GET]
```

### Path

```
/delivery?order_type=<order_type>&result=<result>
```

参数说明:

| 参数      |  说明 | 是否必需
| :-------: | :--------: | :------: |
| type | 订单类型状态(redeem/cranemachine/vip) | 是
| result | 订单标识结果(ok/doubtful/cheated)| 否

样例:

```
/delivery?type=redeem&result=doubtful
```

### Response

JsonSchema

```JAVASCRIPT
{
    type: 'object',
    required: ['orders'],
    properties: {
        orders: {
            type: 'array',
            minItems: 0,
            uniqueItems: true,
            items: {
                type: 'object',
                required: ['user_id', 'order_id', 'price', 'email', 'status', 'result'],
                properties: {
                    user_id: {type: 'string'},
                    order_id: {type: 'integer'},
                    country_code: {type: 'string'},
                    sku: {type: 'string'},
                    price: {type: 'integer'},
                    exchange_rate: {type: 'integer'},
                    email: {type: 'string'},
                    env: {type: 'object'},
                    item: {type: 'object'},
                    status: {type: 'string'},
                    result: {type: 'string'},
                    reason: {type: 'string'}
                }
            }
        }
    }
}
```

样例:

```json
{
    orders:[{
        user_id: 'BountyGame_kPxz6UjtAJ',
        order_id: 1502492282686,
        country_code: 'US',
        sku: 'amazon_gb_1',
        price: 10000,
        email: 'sparrow13_8@live.ca',
        env: {
            "ip": "99.240.144.74",
            "client_name": "iOS_BountyGame",
            "client_version": "3.6",
            "app_name": "BountyGame",
            "platform": "iOS"
        },
        item: {
            "district": "us",
            "base_coins": 100000,
            "status": "online",
            "worth": "$0.01",
            "app_type": "xuancai",
            "country": "us",
            "game_price": "1000",
            "name": "Gift Card $0.01",
            "filter_key": "100000_us",
            "sku": "100000_amazon_us_0.01",
            "type": "amazon",
            "price": "1000",
            "email": "sparrow13_8@live.ca"
        },
        status: 'ongoing',
        result: 'doubtful'
        reason: "too many friends"
    },
    {
        user_id: 'BountyGame_NEzuPdAh3r',
        order_id: 1502615694756,
        country_code: 'US',
        sku: 'amazon_us_0.01',
        price: 1000,
        email: 'sonicthedark7@gmail.com',
        env: {
            "ip": "107.77.213.9",
            "client_name": "iOS_BountyGame",
            "client_version": "3.6",
            "app_name": "BountyGame",
            "platform": "iOS"
        },
        item: {
            "district": "us",
            "base_coins": 100000,
            "status": "online",
            "worth": "$0.01",
            "app_type": "xuancai",
            "country": "us",
            "game_price": "1000",
            "name": "Gift Card $0.01",
            "filter_key": "100000_us",
            "sku": "100000_amazon_us_0.01",
            "type": "amazon",
            "price": "1000",
            "email": "sonicthedark7@gmail.com"
        },
        status: 'error',
        result: 'doubtful',
        reason: 'too many friends',
        error_msg: 'not enough inventory'
    }]
}
```

字段说明:

| 字段   | 数据类型|          说明         |
|:--------:|:---------:|:-----------------:|
| status | string| 状态，ongoing/error, error意味着发卡没成功 |

## 修改订单分类

### HTTP Method

```
[POST]
```

### Path

```
/delivery/update
```

### PostBody

| 字段   | 数据类型|说明|样例|是否必需|
|:--------:|:---------:|:-------:|:-:|:-------:|
| user_id | string| 用户ID |"GiftGame_xxxxxxxxxx"|是|
| order_id | integer| 订单编号|1502955404738|是|
| result | string| 更新后结果 ok/doubtful/cheated |"cheated"|是|
| reason | string| 更改结果的理由 | "offer cheated" |否|

示例：

```JSON
{
    "user_id": "GiftTest_1234567890",
    "order_id": 1502955404738,
    "result": "cheated",
    "reason": "offer cheated"
}
```

### Response

JsonSchema

```JAVASCRIPT
{
    type: 'object',
    required: ['order'],
    properties: {
        order: {
            type: 'object',
            required: ['user_id', 'timestamp', 'price', 'email', 'status', 'result'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                country_code: 'US',
                sku: {type: 'string'},
                price: {type: 'integer'},
                email: {type: 'string'},
                env: {type: 'object'},
                item: {type: 'object'},
                status: {type: 'string'},
                result: {type: 'string'},
                reason: {type: 'string'},
                error_msg: {type: 'string'}
            }
        }
    }
}
```

示例：

```json
{
    order: {
        user_id: 'BountyGame_kPxz6UjtAJ',
        order_id: 1502492282686,
        sku: 'amazon_gb_1',
        price: 10000,
        email: 'sparrow13_8@live.ca',
        env: {
            "ip": "99.240.144.74",
            "client_name": "iOS_BountyGame",
            "client_version": "3.6",
            "app_name": "BountyGame",
            "platform": "iOS"
        },
        item: {
            "district": "us",
            "base_coins": 100000,
            "status": "online",
            "worth": "$0.01",
            "app_type": "xuancai",
            "country": "us",
            "game_price": "1000",
            "name": "Gift Card $0.01",
            "filter_key": "100000_us",
            "sku": "100000_amazon_us_0.01",
            "type": "amazon",
            "price": "1000",
            "email": "sparrow13_8@live.ca"
        },
        status: 'ongoing',
        result: 'doubtful',
        reason: 'too many friends',
        error_msg: 'not enough inventory'
    }
}
```

错误码:

|错误码|说明|
|:---:|:---:|
|600|请求参数无效|
|601|该订单不存在|
|902| 用户session失效，重新登录 |

## 发货/拒卡

### HTTP Method

```
[POST]
```

### Path

```
/delivery/deliver
```

### PostBody

JsonSchema:

```JAVASCRIPT
{
	type: 'object',
	properties: {
		order: {
			type: 'object',
			required: ['user_id', 'order_id'],
			properties: {
			    user_id: {type: 'string'},
			    order_id: {type: 'integer'},
			}
		}
	}
}
```

字段说明:

| 字段   | 数据类型|说明|样例|是否必需|
|:--------:|:---------:|:-------:|:-:|:-------:|
| user_id | string| 用户ID|"GiftTest_1234567890"|是|
| order_id | integer| 订单ID | 1502955404738 |是|

示例：

```JSON
{
    "user_id": "GiftTest_1234567890",
    "order_id": 1502955404738
}
```

### Response

JsonSchema:

```JSON
{
    type: 'object',
    required: ['order'],
    properties: {
        order: {
            type: 'object',
            required: ['user_id', 'timestamp', 'status', 'result'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                sku: {type: 'string'},
                price: {type: 'integer'},
                email: {type: 'string'},
                env: {type: 'object'},
                item: {type: 'object'},
                status: {type: 'string'},
                result: {type: 'string'}
                reason: {type: 'string'}
                error_msg: {type: 'string'}
            }
        }
    }
}
```

字段说明:

| 字段   | 数据类型|          说明         |
|:--------:|:---------:|:-----------------:|
| status | string| 状态，complete表示发卡成功，reject表示拒卡成功，error表示发卡或拒卡错误 |
| error_msg | string| 发卡/拒卡错误信息 |

错误码:

|错误码|说明|
|:---:|:---:|
|xxx|请求参数无效|

