# User

本模块包含VIP用户相关操作，包含以下几个接口:

+ VIP Master Signup

## VIP Master Signup

### HTTP Method

````
POST
````

### Path

```
/user/vip/signup
```

### PostBody

| 字段   | 数据类型|说明|样例|是否必需|
|:--------|---------:|:-------:|:-:|:-------:|
|name| string | 用户名|"ruozi"| 是
|password| string | md5采样后密码,即md5(用户输入的password)|"diojadlk"| 是
|email| string | 收款邮箱|"fan_zhang@pinssible.com"| 是
|client_name| string | 客户端名称|"snapfilters"| 是
|platform| string | "iOS"/"Android"|"iOS"| 是

样例:

```json
{ 
    "name": "ruozi",
    "password": "jlksdjfl",
    "email": "fan_zhang@pinssible.com",
    "client_name": "snapfilters",
    "platform": "iOS"
}
```

## Response

JsonSchema:

```javascript
{
    type: 'object',
    required: ['user_id', 'invite_code'],
    properties: {
        user_id: {type: 'string'},
        invite_code: {type: 'string'}
    }
}
```

字段说明:

| 字段   | 数据类型|说明|
|:-------:|---------:|:-------:|
| user_id | string | 用户ID,唯一 |
| iinvite_code | string | 用户邀请码，唯一 |

样例:

```json
{
    "user_id": "snapfilters_1234567890",
    "invite_code": "abcdefg"
}
```

错误码：

| 错误码   | 说明|
|:-------:|:-------:|
| 700 | 请求参数错误 |
| 701 | user_id生成错误 |
| 702 | intive_code生成错误 |
| 902 | session过期，需要重新登陆 |

