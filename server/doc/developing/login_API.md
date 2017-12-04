# Login

本接口用户Boss平台用户登录

## HTTP Method

````
POST
````

## Path

```
/bossuser/login
```

## PostBody

| 字段   | 数据类型|说明|样例|是否必需|
|:--------|---------:|:-------:|:-:|:-------:|
| user_name| string | 用户名|"test_user"| 否
|password| string | 密码|"123456"| 否

PS：若登录时不填写用户名密码也有可能登录成功，表明session仍有效。

样例:

```json
{ 
    "user_name": "test_user",
    "password": "123456",
}
```

## Response

JsonSchema:

```javascript
{
    title: 'Boss User Response JSON Schema v1',
    type: 'object',
    required: ['user_name', 'auth'],
    properties: {
        user_name: {type: 'string'},
        auth: {
            type: "object",
            required: ['Version', 'Action', 'Resource'],
            properties: {
                "Version": {type: "string"},
                "Action": {type: "array"},
                "Resource": {type: "array"}
            }
        }
    }
}
```

字段说明:

| 字段   | 数据类型|说明|
|:-------:|---------:|:-------:|
| user_name | string | 用户名 |
| auth | object | 用户权限 |
| auth.Resource | array | 用户资源权限，通常用来指示用户能看见的一、二级菜单 |
| auth.Action | array | 用户操作权限,如（读、写）等 |

样例:

```json
{
  "user_name": "test_user",
  "auth": {
    "Resource": [
      "order/*"
    ],
    "Version": "2017-08-11",
    "Action": [
      "*"
    ]
  }
}
```

错误码：

| 错误码   | 说明|
|:-------:|:-------:|
| 900 | 用户不存在 |
| 901 | 密码错误 |
| 902 | session过期，需要重新登陆 |
| 903 | login参数错误 |

