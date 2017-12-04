# Delivery For VIP

该模块的作用主要是用于接受VIP订单及发货。

接口分为以下几个部分:

+ 接收订单，机器初筛分类
+ 查询未处理订单
+ 修改订单分类
+ 发货
+ 拒绝

下面分别说明这几个接口

## 接收订单

### HTTP Method

```
[POST]
```

### Path

```
/delivery/vip/makeorder
```

### PostBody

| 字段   | 数据类型|说明|样例|是否必需|
|:--------:|:---------:|:-------:|:-:|:-------:|
| user_id | string| 用户ID |"GiftGame_xxxxxxxxxx"|是|
| client_name | string| 客户端名|"iOS_GiftGame"|是|
| client_version | string| 客户端版本 |"1.0"|是|
| price | number | 兑卡时消耗金币数 | 10000 |是|
| exchange_rate | number | $1对应的金币数 | 7500 |是|
| email | string| 兑换人邮箱，用于发货|"xxx@gmail.com"|是|

示例：

```JSON
{
    "user_id": "GiftTest_1234567890",
    "client_name": "iOS_GiftTest",
    "client_version": "1.0",
    "price": 10000,
    "exchange_rate": 7500,
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
| user_id | string | 用户ID |
| order_id | integer | 订单号(也为订单生成时间戳) |
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
        result: "doubtful",
        reason: "single offer reward too big"
    }
}
```

错误码：

| 错误码   | 说明|
|:-------:|:-------:|
| 600 | 订单格式无效 |

## 查询订单接口

### HTTP Method

```
[GET]
```

### Path

```
/delivery/vip
```

参数说明:

| 字段   | 数据类型|说明|样例|是否必需|
|:--------:|:---------:|:-------:|:-:|:-------:|
| status | string |订单标识结果(ongoing/error)|ongoing| 是
| limit | integer |查询个数，默认50|50| 否
| startKey | object | 某页开始索引,取自返回参数nextKey |{"user_id":"WalletPro_Z7bmHXRwNc","status":"ongoing","timestamp":1510892472664}|否|

样例:

```json
{
    "status": "ongoing",
    "startKey": {
        "user_id": "WalletPro_Z7bmHXRwNc",
        "status": "ongoing",
        "timestamp": 1510892472664
    }
}
```

### Response

JsonSchema

```JAVASCRIPT
{
    type: 'object',
    required: ['orders', 'nextKey'],
    properties: {
        orders: {
            type: 'array',
            minItems: 0,
            uniqueItems: true,
            items: {
                type: 'object',
                required: ['user_id', 'order_id', 'price', 'exchange_rate', 'email', 'status', 'result', 'reason'],
                properties: {
                    user_id: {type: 'string'},
                    order_id: {type: 'integer'},
                    price: {type: 'integer'},
                    exchange_rate: {type: 'integer'},
                    base_value: {type: 'number'},
                    email: {type: 'string'},
                    status: {type: 'string'},
                    result: {type: 'string'},
                    reason: {type: 'string'},
                    error_msg: {type: 'string'}
                }
            }
        },
        nextKey: {type: 'object'}
    }
}
```

样例:

```json
{
    "orders":[{
        "user_id": "BountyGame_kPxz6UjtAJ",
        "order_id": 1502492282686,
        "price": 20000,
        "exchange_rate": 10000,
        "base_value": 2,
        "email": "sparrow13_8@live.ca",
        "status": "ongoing",
        "result": "doubtful"
        "reason": "too many friends"
    },
    {
        "user_id": "BountyGame_NEzuPdAh3r",
        "order_id": 1502615694756,
        "price": 25000,
        "exchange_rate": 10000,
        "base_value": 2.5,
        "email": "sonicthedark7@gmail.com",
        "status": "ongoing",
        "result": "doubtful",
        "reason": "too many friends"
    }],
    "nextKey": {
        "user_id": "WalletPro_Z7bmHXRwNc",
        "status": "ongoing",
        "timestamp": 1510892472664
    }
}
```

字段说明:

| 字段   | 数据类型|          说明         |
|:--------:|:---------:|:-----------------:|
| base_value | number | 系统推荐基础发卡数额 |
| nextKey | object | 下一条订单记录开始索引, 为空表示当前条目为最后一条 |

## 修改订单分类

### HTTP Method

```
[POST]
```

### Path

```
/delivery/vip/update
```

### PostBody

| 字段   | 数据类型|说明|样例|是否必需|
|:--------:|:---------:|:-------:|:-:|:-------:|
| user_id | string| 用户ID |"GiftGame_xxxxxxxxxx"|是|
| order_id | integer| 订单编号|1502955404738|是|
| result | string| 更新后结果 ok/doubtful/cheated |"cheated"|是|
| extra_value | number | 补偿发卡数量,正数表示奖励，负数表示惩罚 | 0.52 |否|
| reason | string| 更改结果的理由 | "offer cheated" |否|

示例：

```JSON
{
    "user_id": "GiftTest_1234567890",
    "order_id": 1502955404738,
    "extra_value": -0.53
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
            required: ['user_id', 'order_id', 'price', 'exchange_rate', 'base_value', 'email', 'status', 'result', 'extra_value'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
                exchange_rate: {type: 'integer'},
                base_value: {type: 'number'},
                extra_value: {type: 'number'},
                email: {type: 'string'},
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
        price: 25300,
        exchange_rate: 10000,
        base_value: 2.53,
        extra_value: -0.53,
        email: 'sparrow13_8@live.ca',
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

## 发货

### HTTP Method

```
[POST]
```

### Path

```
/delivery/vip/deliver
```

### PostBody

JsonSchema:

```JAVASCRIPT
{
	type: 'object',
	properties: {
        user_id: {type: 'string'},
        order_id: {type: 'integer'},
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

```JAVASCRIPT
{
    type: 'object',
    required: ['order'],
    properties: {
        order: {
            type: 'object',
            required: ['user_id', 'order_id', 'price', 'exchange_rate', 'base_value', 'email', 'status', 'result', 'giftcard_item', 'mail_id'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
                exchange_rate: {type: 'integer'},
                base_value: {type: 'number'},
                extra_value: {type: 'number'},
                email: {type: 'string'},
                status: {type: 'string'},
                result: {type: 'string'},
                reason: {type: 'string'},
                error_msg: {type: 'string'},
                giftcard_item: {type: 'array'},
                mail_id: {type: 'string'}
            }
        }
    }
}
```

字段说明:

| 字段   | 数据类型|          说明         |
|:--------:|:---------:|:-----------------:|
| giftcard_item | array| 订单卡片信息 |
| status | string| 状态，complete表示发货成功，error表示发货错误 |
| error_msg | string| 发货错误信息 |
| mail_id | string | 发卡后的邮件ID |

错误码:

|错误码|说明|
|:---:|:---:|
|600|请求参数无效|
|602|订单result无效,仅在result为"ok"时才能发货|

## 拒绝订单

### HTTP Method

```
[POST]
```

### Path

```
/delivery/vip/reject
```

### PostBody

JsonSchema:

```JAVASCRIPT
{
	type: 'object',
	properties: {
        user_id: {type: 'string'},
        order_id: {type: 'integer'},
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

```JAVASCRIPT
{
    type: 'object',
    required: ['order'],
    properties: {
        order: {
            type: 'object',
            required: ['user_id', 'order_id', 'price', 'exchange_rate', 'base_value', 'email', 'status', 'result'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
                exchange_rate: {type: 'integer'},
                base_value: {type: 'number'},
                extra_value: {type: 'number'},
                email: {type: 'string'},
                status: {type: 'string'},
                result: {type: 'string'},
                reason: {type: 'string'},
                error_msg: {type: 'string'}
            }
        }
    }
}
```

字段说明:

| 字段   | 数据类型|          说明         |
|:--------:|:---------:|:-----------------:|
| status | string| 状态，canceled表示拒绝订单成功，error表示拒绝订单错误 |
| error_msg | string| 错误信息 |

错误码:

|错误码|说明|
|:---:|:---:|
|600|请求参数无效|
|602|订单result无效,仅在result为"cheated"时才能拒绝|

