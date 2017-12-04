# Inventory

该模块主要作用为库存管理,包含如下两个主要功能:

+ 库存采购
+ 库存查询

## 库存采购

### HTTP Method 

```
PUT
```

### Path

```
/inventory
```

### Body

请求参数如下：

```
{
    type: 'object',
    required: ['sku', 'serial'],
    properties: {
        sku: {type: 'string'},
        serial: {type: 'string'}
    }
}
```

请求字段说明如下：

| 字段   | 数据类型|说明|样例|是否必填|
|:--------|---------:|:-------:|:-------:|:-------:|
|sku|string|商品库存货物唯一标识|'amazon_ca_4'|是|
|serial|string|库存单件唯一标识|'aset-erte-dfet'|是|

请求示例：

```
{
    sku: 'amazon_ca_1',
    serial: 'aset-erte-dfet'
}
```

###  Response

请求返回为json格式,具体内容如下：

```
{
    type: 'object',
    required: ['sku', 'timestamp'],
    properties: {
        sku: {type: 'string'},
        timestamp: {type: 'integer'}
    }
}
```

返回字段说明如下：

| 字段   | 数据类型|说明|
|:--------:|:---------:|:-------:|
|timestamp|integer|录入时间|

返回示例：

```
{
    sku: 'amazon_gb_1',
    timestamp: 1503645044738
}
```

错误码:

|错误码|说明|
|:---:|:---:|
|600| 请求参数无效 |
|603| SKU不存在，需要先填写SKU属性 |
|902| 用户session失效，重新登录 |

## 卡片库存查询

### HTTP Method 

```
GET
```

### Path

```
/inventory?sku=<sku>
```

参数说明:

| 参数      |  说明 | 是否必需
| :-------: | :--------: | :------: |
| sku | 具体sku| 是

请求示例：

```
/inventory?sku=amazon_ca_1
```

### Response

请求返回为json格式，具体如下：

```
{
    type: 'object',
    properties: {
        <sku>: {
            type: 'object',
            required: ['count'],
            properties: {
                count: {type: 'integer'},
            }
        }
    }
}
```

返回字段说明如下：

| 字段   | 数据类型|说明|样例|
|:--------:|:---------:|:-------:|:-------:|
|count|integer|数量|5|

返回示例：

```
{	
    amazon_ca_4: {
        count: 5
    }
}
```