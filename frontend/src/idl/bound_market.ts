export type BoundMarket = {
  "version": "0.1.0",
  "name": "contracts",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "orderbook",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "orderbook"
              },
              {
                "kind": "arg",
                "type": "u8",
                "path": "assetTypeInput"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "assetTypeInput",
          "type": "u8"
        }
      ]
    },
    {
      "name": "registerTrader",
      "accounts": [
        {
          "name": "orderbook",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "trader",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "traderState",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "trader"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "initialFunds",
          "type": "u64"
        }
      ]
    },
    {
      "name": "placeStayInOrder",
      "accounts": [
        {
          "name": "orderbook",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "trader",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "traderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stayInOrders",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "widthPercentage",
          "type": "f64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "placeBreakoutOrder",
      "accounts": [
        {
          "name": "orderbook",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "trader",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "traderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "breakoutOrders",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "widthPercentage",
          "type": "f64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "matchPositionOrder",
      "accounts": [
        {
          "name": "orderbook",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "trader",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "traderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "funder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "funderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liquidityOrder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "positionOrder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liquidityOrders",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "orderType",
          "type": "u8"
        },
        {
          "name": "widthPercentage",
          "type": "f64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancelOrder",
      "accounts": [
        {
          "name": "orderbook",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "trader",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "traderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ordersPda",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "processExpiredOrders",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "orderbook",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orders",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "orderAccounts",
          "type": {
            "vec": "publicKey"
          }
        }
      ]
    },
    {
      "name": "settleOrder",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "orderbook",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "trader",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "currentPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updatePrice",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "orderbook",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oracle",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newPrice",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "PassageOrderbook",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetType",
            "type": {
              "defined": "AssetType"
            }
          },
          {
            "name": "basePrice",
            "type": "u64"
          },
          {
            "name": "nextSequenceNumber",
            "type": "u64"
          },
          {
            "name": "minPercentageWidth",
            "type": "f64"
          },
          {
            "name": "maxPercentageWidth",
            "type": "f64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Order",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": {
              "defined": "OrderId"
            }
          },
          {
            "name": "orderType",
            "type": {
              "defined": "OrderType"
            }
          },
          {
            "name": "assetType",
            "type": {
              "defined": "AssetType"
            }
          },
          {
            "name": "widthPercentage",
            "type": "f64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "trader",
            "type": "publicKey"
          },
          {
            "name": "basePrice",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": "OrderStatus"
            }
          },
          {
            "name": "expiration",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "TraderState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "trader",
            "type": "publicKey"
          },
          {
            "name": "lockedFunds",
            "type": "u64"
          },
          {
            "name": "freeFunds",
            "type": "u64"
          },
          {
            "name": "orders",
            "type": {
              "vec": {
                "defined": "OrderId"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "OrderId",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "widthPercentageScaled",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "u64"
          },
          {
            "name": "sequenceNumber",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "AssetType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "BTC"
          },
          {
            "name": "ETH"
          },
          {
            "name": "BNB"
          },
          {
            "name": "GMX"
          }
        ]
      }
    },
    {
      "name": "OrderType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "StayIn"
          },
          {
            "name": "Breakout"
          }
        ]
      }
    },
    {
      "name": "OrderStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Pending"
          },
          {
            "name": "Active"
          },
          {
            "name": "Completed"
          },
          {
            "name": "Cancelled"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidAssetType",
      "msg": "Invalid asset type provided"
    },
    {
      "code": 6001,
      "name": "InvalidWidthPercentage",
      "msg": "Width percentage outside allowed range"
    },
    {
      "code": 6002,
      "name": "TraderNotRegistered",
      "msg": "Trader not registered"
    },
    {
      "code": 6003,
      "name": "InsufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6004,
      "name": "NoMatchingOrders",
      "msg": "No matching orders found"
    },
    {
      "code": 6005,
      "name": "NotAuthorized",
      "msg": "Not authorized to cancel this order"
    },
    {
      "code": 6006,
      "name": "OrderNotFound",
      "msg": "Order not found"
    },
    {
      "code": 6007,
      "name": "OrderNotActive",
      "msg": "Order is not active"
    },
    {
      "code": 6008,
      "name": "InvalidOracleFeed",
      "msg": "Invalid oracle price feed"
    },
    {
      "code": 6009,
      "name": "InvalidOrderType",
      "msg": "Invalid order type"
    }
  ]
}; 