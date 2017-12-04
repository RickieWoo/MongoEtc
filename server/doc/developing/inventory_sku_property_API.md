# Inventory SKU Property

该模块主要作用为SKU属性管理,包含如下两个主要功能:

+ SKU属性创建
+ SKU属性编辑
+ SKU属性查询

## SKU属性创建

### HTTP Method 

```
PUT
```

### Path

```
/sku
```

### Body

请求参数如下：

```
{
    type: 'object',
    required: ['sku', 'category'],
    properties: {
        sku: {type: 'string'},
        category: {type: 'string'},
        price: {type: 'number'},
        currency_code: {type: 'string'}
    }
}
```

请求字段说明如下：

| 字段   | 数据类型|说明|样例|是否必填|
|:--------|---------:|:-------:|:-------:|:-------:|
|sku|string|商品库存货物唯一标识|'amazon_ca_4'|是|
|category|string|商品分类，用于检索|'amazon_ca'|否|
|price|number|商品价格|4|否|
|currency_code|string|货币编码,参照ISO-4217|'USD'|否|

请求示例：

```
{
    sku: 'amazon_ca_1',
    category: 'amazon_ca',
    price: 1,
    currency_code: 'CAD'
}
```

###  Response

请求返回为json格式,具体内容如下：

```
{
    type: 'object',
    required: ['sku', 'category'],
    properties: {
        sku: {type: 'string'},
        category: {type: 'string'},
        price: {type: 'number'},
        currency_code: {type: 'string'},
        create_timestamp: {type: 'integer'}
    }
}
```

返回字段说明如下：

| 字段   | 数据类型|说明|
|:--------:|:---------:|:-------:|
|create_timestamp|integer|录入时间|

返回示例：

```
{
    sku: 'amazon_gb_1',
    category: 'amazon_ca',
    price: 1,
    currency_code: 'CAD',
    create_timestamp: 1503645044738
}
```

错误码:

|错误码|说明|
|:---:|:---:|
|600| 请求参数无效 |
|902| 用户session失效，重新登录 |

## SKU属性编辑

### HTTP Method

```
POST
```

### Path

```
/sku
```

### Body

请求参数如下：

```
{
    type: 'object',
    required: ['sku'],
    properties: {
        sku: {type: 'string'},
        //更新属性
    }
}
```

请求字段说明如下：

| 字段   | 数据类型|说明|样例|是否必填|
|:--------|---------:|:-------:|:-------:|:-------:|
|sku|string|商品库存货物唯一标识|'amazon_ca_4'|是|

请求示例：

```
{
    sku: 'amazon_ca_1',
    category: 'amazon_ca',
    price: 1,
    currency_code: 'CAD'
}
```

###  Response

请求返回为json格式,具体内容如下：

```
{
    type: 'object',
    required: ['sku', 'category'],
    properties: {
        sku: {type: 'string'},
        category: {type: 'string'},
        price: {type: 'number'},
        currency_code: {type: 'string'},
        update_timestamp: {type: 'integer'}
    }
}
```

返回字段说明如下：

| 字段   | 数据类型|说明|
|:--------:|:---------:|:-------:|
|update_timestamp|integer|录入时间|

返回示例：

```
{
    sku: 'amazon_gb_1',
    category: 'amazon_ca',
    price: 1,
    currency_code: 'CAD',
    update_timestamp: 1503645044738
}
```

错误码:

|错误码|说明|
|:---:|:---:|
|600| 请求参数无效 |
|902| 用户session失效，重新登录 |

## SKU属性查询

### HTTP Method 

```
GET
```

### Path

```
/sku
```

或者

```
/sku?sku=<sku>
```

或者

```
/sku?category=<category>
```

参数说明:

| 参数      |  说明 | 是否必需
| :-------: | :--------: | :------: |
| sku | 具体sku| 否

备注：

+ 若请求没有sku参数，返回整个SKU属性表

请求示例：

```
/sku
```

```
/sku?sku=amazon_ca_1
```

```
/sku?category=amazon_ca
```

### Response

请求返回为json格式，具体如下：

```
{
    type: 'object',
    properties: {
        <sku>: {
            type: 'object',
            required: [],
            properties: {
                category: {type: 'string'},
                price: {type: 'number'},
                currency_code: {type: 'string'}
            }
        }
    }
}
```

返回字段说明如下：

| 字段   | 数据类型|说明|样例|
|:--------:|:---------:|:-------:|:-------:|
|category|string|分类|'amazon_gb'|
|price|number|面值| 20 |
|currency_code|string|货币编码,参照ISO-4217|'USD'|

返回示例：

```
{	
    amazon_ca_4: {
        category : 'amazon_ca',
        price: 4,
        currency_code : 'CAD'
    },
    amazon_ca_5: {
        category : 'amazon_ca',
        price: 5,
        currency_code: 'CAD'
    }
}
```