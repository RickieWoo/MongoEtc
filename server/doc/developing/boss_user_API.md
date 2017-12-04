# boss_user_API

本接口用于用户管理

- 查询已有用户列表
- 查询单个用户
- 增加用户
- 修改用户信息
- 删除用户

## 查询已有用户列表

#### HTTP Method

```http
[GET]
```

#### Path

```http
/bossuser/userlist&limit=<limit_num>&page=<page>
```

###### 参数说明

| 参数    | 说明      | 默认   | 是否必须 |
| ----- | ------- | ---- | ---- |
| limit | 每页显示的个数 | 25   | 否    |
| page  | 页数      | 1    | 否    |

###### 样例

```http
/bossuser/userlist&limit=25&page=2
```

### Response

###### JsonSchema:

```javascript
{
	type: 'object', 
	properties: {
		users: {
			type: 'array', 
			items: {
				type: 'object', 
				properties: {
					user_name: {type: 'string'},
					auth: {
						type: 'object', 
						properties: {
							Version: {type: 'string'}, 
							Action: {
								type: 'array', 
								items: {type: 'string'}
							}, 
							Resource: {
								type: 'array', 
								items: {type: 'string'}
							}  
						}
					}
				}
			}
		},
		nextKey: {type: 'object'}
	},
};
```

#### 字段说明:

| 字段        | 数据类型   | 说明          |
| --------- | ------ | ----------- |
| user_name | string | 用户姓名，唯一     |
| auth      | object | 权限          |
| version   | string | 权限的         |
| action    | array  | 可执行的操作      |
| resource  | string | 资源，可访问的路由   |
| nextKey   | object | 下一条订单记录开始索引 |

###### 样例：

```json
{
  "users": [
    {
      "user_name": "test_user",
      "auth": {
        "Version": "2017-08-11",
        "Action": [
          "*"
        ],
        "Resource": [
          "order/*",
          "user/*"
        ]
      }
    },
    {
      "user_name": "test_user2",
      "auth": {
        "Version": "2017-08-11",
        "Action": [
          "*"
        ],
        "Resource": [
          "order/*",
          "user/*"
        ]
      }
    }
  ],
    nextKey: {
    "user_name": "someone"
  }
}
```

###### 错误码：

| 错误码  |   说明   |
| :--: | :----: |
| xxx  | 请求参数无效 |
|      |        |

## 查询某个用户

#### HTTP Method

```http
[GET]
```

#### Path

```http
/bossuser/user?user_name=<user_name>
```

###### 参数说明

| 参数        | 说明       | 是否必须 |
| --------- | -------- | ---- |
| user_name | 要查询的用户姓名 | 是    |

###### 样例

```http
/bossuser/user?user_name=test_user
```

#### Response

###### JsonSchema:

```javascript
{
  "type": "object", 
  "properties": {
    "user_name": {"type": "string"},
    "auth": {
      "type": "object", 
      "properties": {
        "Version": {"type": "string"}, 
        "Action": {
          "type": "array", 
          "items": {"type": "string"}
        }, 
        "Resource": {
          "type": "array", 
          "items": {"type": "string"}
        }
      }
    }
  }
}
```

###### 字段说明:

| 字段        | 数据类型   | 说明        |
| --------- | ------ | --------- |
| user_name | string | 用户姓名，唯一   |
| auth      | object | 权限        |
| version   | string | 权限的版本     |
| action    | array  | 可执行的操作    |
| resource  | string | 资源，可访问的路由 |

###### 样例：

```json
{
	"user_name": "test_user",
	"auth": {
		"Version": "2017-08-11",
      	"Action": [
			"*"
		],
		"Resource": [
			"order/*",
			"user/*"
		]
	}
}
```

###### 错误码：

| 错误码  |  说明   |
| :--: | :---: |
| 900  | 用户不存在 |
|      |       |



## 新增用户

#### HTTP Method

```http
[POST]
```

#### Path

```http
/bossuser/newuser
```

### PostBody

| 字段        | 数据类型   | 说明   | 样例                                       | 是否必需 |
| --------- | ------ | ---- | ---------------------------------------- | ---- |
| user_name | string | 用户名  | “test_user”                              | 是    |
| password  | string | 密码   | "96e79218965eb72c92a549dd5a330112"       | 是    |
|           |        |      | 说明：md5加密，如果忘记密码联系管理员重置                   |      |
| auth      | object | 权限   | {"Version": "2017-08-11","Action": [ "*"],"Resource": ["order/*",  "user/*"]} | 是    |

###### JsonSchema:

```javascript
{
  "type": "object", 
  "properties": {
    "user_name": {"type": "string"}, 
    "password": {"type": "string"},   
    "auth": {
      "type": "object", 
      "properties": {
        "Version": {"type": "string"}, 
        "Action": {
          "type": "array", 
          "items": {"type": "string"}
        }, 
        "Resource": {
          "type": "array", 
          "items": {"type": "string"}
        }
      }
    }
  }
}
```

###### 示例

```json
{
	"user_name": "test_user",
  	"password":  "96e79218965eb72c92a549dd5a330112",
	"auth": {
		"Version": "2017-08-11",
      	"Action": [
			"*"
		],
		"Resource": [
			"order/*",
			"user/*"
		]
	}
}
```

#### Response

###### JsonSchema:

```javascript
{
	type: 'object',
	properties: {
		user: {
			type: 'object',
			required: [	'user_name'],
			properties: {
			    user_name: {type: 'string'}
			}
		}
	}
}
```

###### 字段说明:

| 字段        | 数据类型   | 说明      |
| --------- | ------ | ------- |
| user_name | string | 用户姓名，唯一 |

###### 样例：

```json
{
    user: {
        user_name: "test_user"
    }
}
```

###### 错误码：

| 错误码  |  说明   |
| :--: | :---: |
| 905  | 用户已存在 |
|      |       |

## 修改用户信息

#### HTTP Method

```http
[PUT]
```

#### Path

```http
/bossuser/updateuser
```

###### 参数说明

| 参数        | 说明       | 是否必须 |
| --------- | -------- | ---- |
| user_name | 要更新的用户姓名 | 是    |

###### 样例

```http
/bossuser/updateuser
```

### PostBody

| 字段        | 数据类型   | 说明          | 样例                                       | 是否必需 |
| --------- | ------ | ----------- | ---------------------------------------- | ---- |
| user_name | string | 用户名         | “test_user”                              | 是    |
| password  | string | 密码（md5加密后的） | "96e79218965eb72c92a549dd5a330112"       | 否    |
| auth      | object | 权限          | {"Version": "2017-08-11","Action": [ "*"],"Resource": ["order/*",  "user/*"]} | 否    |

###### JsonSchema:

```javascript
{
  "type": "object", 
  "properties": {
    "user_name": {"type": "string"},
    "password": {"type": "string"},
    "auth": {
      "type": "object", 
      "properties": {
        "Version": {"type": "string"}, 
        "Action": {
          "type": "array", 
          "items": {"type": "string"}
        }, 
        "Resource": {
          "type": "array", 
          "items": {"type": "string"}
        }
      }
    }
  }
}
```

###### 示例

```json
{
	"user_name": "test_user",
 	"password":  "96e79218965eb72c92a549dd5a330112",
	"auth": {
		"Version": "2017-08-11",
      	"Action": [
			"*"
		],
		"Resource": [
			"order/*",
			"user/*"
		]
	}
}
```

#### Response

###### JsonSchema:

```javascript
{
	type: 'object',
	properties: {
		user: {
			type: 'object',
			required: [	'user_name'],
			properties: {
			    user_name: {type: 'string'}
			}
		}
	}
}
```

###### 字段说明:

| 字段        | 数据类型   | 说明      |
| --------- | ------ | ------- |
| user_name | string | 用户姓名，唯一 |

###### 样例：

```json
{
    user: {
        user_name: "test_user",
        status: true,
    }
}
```

###### 错误码：

| 错误码  |  说明   |
| :--: | :---: |
| 900  | 用户不存在 |
|      |       |

## 删除用户

#### HTTP Method

```http
[DELETE]
```

#### Path

```http
/bossuser/deleteuser?user_name=<user_name>
```

###### 参数说明

| 参数        | 说明       | 是否必须 |
| --------- | -------- | ---- |
| user_name | 要删除的用户姓名 | 是    |

###### 样例

```http
/bossuser/deleteuser?user_name=test_user
```

#### Response

###### JsonSchema:

```javascript
{
	type: 'object',
	properties: {
		user: {
			type: 'object',
			required: [	'user_name'],
			properties: {
			    user_name: {type: 'string'}
			}
		}
	}
}
```

###### 字段说明:

| 字段        | 数据类型   | 说明      |
| --------- | ------ | ------- |
| user_name | string | 用户姓名，唯一 |

###### 样例：

```json
{
    user: {
        user_name: "test_user"
    }
}
```

###### 错误码：

| 错误码  |  说明   |
| :--: | :---: |
| 900  | 用户不存在 |
|      |       |



##  