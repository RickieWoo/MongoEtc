{
  type: 'object',
  required: ['users', 'nextKey'],
  properties: {
      users: {
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