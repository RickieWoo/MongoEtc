# Delivery for app internal purchase

该模块的作用主要是用于接受in_app订单及发货。

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
/delivery/in_app/makeorder
```

### PostBody

| 字段   | 数据类型|说明|样例|是否必需|
|:--------:|:---------:|:-------:|:-:|:-------:|
| user_id | string| 用户ID |"GiftGame_xxxxxxxxxx"|是|
| client_name | string| 客户端名|"iOS_GiftGame"|是|
| client_version | string| 客户端版本 |"1.0"|是|
| ip | string| 兑卡时请求的IP |"x.x.x.x"|是|
| item | object| 兑卡时商品信息 | 略 |是|
| price | number | 兑卡时消耗金币数 | 10000 |是|
| sku | string| 兑换货物库存标识 |"amazon_us_1"|是|
| email | string| 兑换人邮箱，用于发货|"xxx@gmail.com"|是|
|order_type|string|订单类型|redeem|是

示例：

```JSON
{
    "user_id": "GiftTest_1234567890",
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
    "email": "test@pinssible.com",
    "order_type": "redeem"
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
        result: "ok",
        reason: "unclassified"
    }
}
```

错误码：

| 错误码   | 说明|
|:-------:|:-------:|
| 600 | 订单格式无效 |
| 902 | 用户session失效，重新登录 |

## 查询订单接口

### HTTP Method

```
[POST]
```

### Path

```
/delivery/in_app
```

Body参数说明:

| 字段   | 数据类型|说明|样例|是否必需|
|:--------:|:---------:|:-------:|:-:|:-------:|
| status | string | 订单状态(ongoing/error) | ongoing | 是
|order_type|string|订单类型|redeem|是
| limit | integer |查询个数，默认50|50| 否
| startKey | object | 某页开始索引,取自返回参数nextKey |{"user_id":"WalletPro_Z7bmHXRwNc","status":"ongoing","timestamp":1510892472664}|否|

样例:

```json
{
    "status": "ongoing",
    "order_type": "redeem",
    "limit": 50,
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
                required: ['user_id', 'order_id', 'price', 'email', 'status', 'result', 'reason'],
                properties: {
                    user_id: {type: 'string'},
                    order_id: {type: 'integer'},
                    price: {type: 'integer'},
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
  "orders": [
    {
      "reason": "doubtful",
      "item": {
        "country": "us",
        "app_type": "xuancai",
        "filter_key": "7500_us",
        "type": "amazon",
        "platform": "iOS",
        "worth": "$3",
        "price": "15000",
        "district": "us",
        "name": "Gift Card $3",
        "sku": "7500_amazon_us_3",
        "email": "Mohamed.hor@gmail.com",
        "base_coins": 7500,
        "status": "online"
      },
      "result": "doubtful",
      "country_code": "US",
      "user_id": "AnScratchPyramid_rbkJFKx4S7",
      "price": 15000,
      "client_version": "3.0",
      "sku": "amazon_us_3",
      "client_name": "Android_AnScratchPyramid",
      "order_type": "redeem",
      "email": "Mohamed.hor@gmail.com",
      "status": "ongoing",
      "order_id": 1504683470262
    },
    ...
  ],
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
| status | string| 状态，ongoing/error, error意味着发卡没成功 |
| nextKey | object | 下一条订单记录开始索引 |

错误码:

|错误码|说明|
|:---:|:---:|
|600|请求参数无效|

## 修改订单分类

### HTTP Method

```
[POST]
```

### Path

```
/delivery/in_app/update
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
            required: ['user_id', 'order_id', 'price', 'email', 'status', 'result', 'reason'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
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
    "order": {
         "reason": "offer cheated",
         "item": {
             "country": "gb",
             "app_type": "xuancai",
             "filter_key": "7500_gb",
             "type": "amazon",
             "platform": "iOS",
             "worth": "£1",
             "price": "9000",
             "district": "gb",
             "name": "Gift Card £1",
             "sku": "7500_amazon_gb_1",
             "email": "dixan_95@hotmail.it",
             "base_coins": 7500,
             "status": "online"
         },
         "ip": "82.8.192.24",
         "result": "cheated",
         "country_code": "GB",
         "user_id": "FreeCasino_fXYMrDpQKU",
         "price": 9000,
         "client_version": "3.3",
         "sku": "amazon_gb_1",
         "client_name": "iOS_FreeCasino",
         "order_type": "redeem",
         "email": "dixan_95@hotmail.it",
         "status": "ongoing",
         "order_id": 1504682316816
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
/delivery/in_app/deliver

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
            required: ['user_id', 'order_id', 'price', 'email', 'status', 'result', 'reason', 'giftcard_item'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
                email: {type: 'string'},
                status: {type: 'string'},
                result: {type: 'string'},
                reason: {type: 'string'},
                error_msg: {type: 'string'},
                giftcard_item: {type: 'array'},
                mail_id: {type: 'string'}          // not required because paypal order does not send email
            }
        }
    }
}
```

字段说明:

| 字段   | 数据类型|          说明         |
|:--------:|:---------:|:-----------------:|
| giftcard_item | array| 订单卡片信息 |
| status | string| 状态，complete表示发卡成功，reject表示拒卡成功，error表示发卡或拒卡错误 |
| error_msg | string| 发卡/拒卡错误信息 |
| mail_id | string | 发卡后的邮件ID |

错误码:

|错误码|说明|
|:---:|:---:|
|600|请求参数无效|
|601|订单不存在|
|602|订单result无效,仅在result为"ok"且status为"ongoing/error"时才能发货|

## 拒绝订单

### HTTP Method

```
[POST]
```

### Path

```
/delivery/in_app/reject
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
            required: ['user_id', 'order_id', 'price', 'email', 'status', 'result', 'reason'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
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

|600|请求参数无效|
|601|订单不存在|
|602|订单result无效,仅在result为"cheated"且status为"ongoing/error"时才能发货|