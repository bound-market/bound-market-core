/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/contracts.json`.
 */
export type Contracts = {
  "address": "6RxZztEMgGnwza7GL1UsUjd4xWNauqm8zXQt5vbWvNrK",
  "metadata": {
    "name": "contracts",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelOrder",
      "discriminator": [
        95,
        129,
        237,
        240,
        8,
        49,
        223,
        132
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "traderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "order",
          "writable": true
        },
        {
          "name": "orderbook",
          "writable": true
        },
        {
          "name": "ordersPda",
          "docs": [
            "Used to store orders of the appropriate type"
          ],
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderbook",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114,
                  98,
                  111,
                  111,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "assetTypeInput"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "name": "matchPositionOrder",
      "discriminator": [
        66,
        231,
        27,
        50,
        72,
        215,
        123,
        139
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "traderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "funderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "funder"
              }
            ]
          }
        },
        {
          "name": "funder",
          "docs": [
            "The trader who provided liquidity for the matching"
          ]
        },
        {
          "name": "orderbook",
          "writable": true
        },
        {
          "name": "liquidityOrder",
          "writable": true
        },
        {
          "name": "positionOrder",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "orderbook.next_sequence_number",
                "account": "passageOrderbook"
              }
            ]
          }
        },
        {
          "name": "liquidityOrders",
          "docs": [
            "Used to store liquidity orders"
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "docs": [
            "The clock sysvar is used for timestamps"
          ],
          "address": "SysvarC1ock11111111111111111111111111111111"
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
      "name": "placeBreakoutOrder",
      "discriminator": [
        214,
        207,
        69,
        17,
        139,
        96,
        17,
        54
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "traderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "orderbook",
          "writable": true
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "orderbook.next_sequence_number",
                "account": "passageOrderbook"
              }
            ]
          }
        },
        {
          "name": "breakoutOrders",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  114,
                  101,
                  97,
                  107,
                  111,
                  117,
                  116,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "orderbook"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "name": "placeStayInOrder",
      "discriminator": [
        110,
        15,
        4,
        37,
        91,
        252,
        101,
        241
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "traderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "orderbook",
          "writable": true
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "orderbook.next_sequence_number",
                "account": "passageOrderbook"
              }
            ]
          }
        },
        {
          "name": "stayInOrders",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  121,
                  95,
                  105,
                  110,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "orderbook"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "name": "processExpiredOrders",
      "discriminator": [
        216,
        5,
        212,
        147,
        77,
        119,
        142,
        109
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderbook",
          "writable": true
        },
        {
          "name": "orders"
        },
        {
          "name": "clock",
          "docs": [
            "The clock sysvar is used for timestamps"
          ],
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "orderAccounts",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    },
    {
      "name": "registerTrader",
      "discriminator": [
        75,
        243,
        224,
        167,
        1,
        5,
        51,
        32
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "traderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "name": "settleOrder",
      "discriminator": [
        80,
        74,
        204,
        34,
        12,
        183,
        66,
        66
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderbook",
          "writable": true
        },
        {
          "name": "order",
          "writable": true
        },
        {
          "name": "trader",
          "docs": [
            "The owner of the order"
          ],
          "writable": true
        },
        {
          "name": "traderState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "clock",
          "docs": [
            "The clock sysvar is used for timestamps"
          ],
          "address": "SysvarC1ock11111111111111111111111111111111"
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
      "discriminator": [
        61,
        34,
        117,
        155,
        75,
        34,
        123,
        208
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "orderbook",
          "writable": true
        },
        {
          "name": "oracle",
          "docs": [
            "For now, we just take the price as a parameter"
          ]
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
      "name": "order",
      "discriminator": [
        134,
        173,
        223,
        185,
        77,
        86,
        28,
        51
      ]
    },
    {
      "name": "passageOrderbook",
      "discriminator": [
        209,
        227,
        108,
        153,
        254,
        248,
        140,
        21
      ]
    },
    {
      "name": "traderState",
      "discriminator": [
        124,
        33,
        101,
        17,
        158,
        79,
        26,
        140
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAssetType",
      "msg": "Invalid asset type provided"
    },
    {
      "code": 6001,
      "name": "invalidWidthPercentage",
      "msg": "Width percentage outside allowed range"
    },
    {
      "code": 6002,
      "name": "traderNotRegistered",
      "msg": "Trader not registered"
    },
    {
      "code": 6003,
      "name": "insufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6004,
      "name": "noMatchingOrders",
      "msg": "No matching orders found"
    },
    {
      "code": 6005,
      "name": "notAuthorized",
      "msg": "Not authorized to cancel this order"
    },
    {
      "code": 6006,
      "name": "orderNotFound",
      "msg": "Order not found"
    },
    {
      "code": 6007,
      "name": "orderNotActive",
      "msg": "Order is not active"
    },
    {
      "code": 6008,
      "name": "invalidOracleFeed",
      "msg": "Invalid oracle price feed"
    },
    {
      "code": 6009,
      "name": "invalidOrderType",
      "msg": "Invalid order type"
    }
  ],
  "types": [
    {
      "name": "assetType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "btc"
          },
          {
            "name": "eth"
          },
          {
            "name": "bnb"
          },
          {
            "name": "gmx"
          }
        ]
      }
    },
    {
      "name": "order",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": {
              "defined": {
                "name": "orderId"
              }
            }
          },
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "orderType"
              }
            }
          },
          {
            "name": "assetType",
            "type": {
              "defined": {
                "name": "assetType"
              }
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
            "type": "pubkey"
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
              "defined": {
                "name": "orderStatus"
              }
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
      "name": "orderId",
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
      "name": "orderStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "active"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "orderType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "stayIn"
          },
          {
            "name": "breakout"
          }
        ]
      }
    },
    {
      "name": "passageOrderbook",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetType",
            "type": {
              "defined": {
                "name": "assetType"
              }
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
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "traderState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "trader",
            "type": "pubkey"
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
                "defined": {
                  "name": "orderId"
                }
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
  "constants": [
    {
      "name": "seed",
      "type": "string",
      "value": "\"anchor\""
    }
  ]
};
