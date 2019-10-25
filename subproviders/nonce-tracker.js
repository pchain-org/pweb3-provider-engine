const inherits = require('util').inherits
const Transaction = require('pchainjs-tx')
const ethUtil = require('ethereumjs-util')
const Subprovider = require('./subprovider.js')
const blockTagForPayload = require('../util/rpc-cache-utils').blockTagForPayload
var Buffer = require('safe-buffer').Buffer;

module.exports = NonceTrackerSubprovider

// handles the following RPC methods:
//   eth_getTransactionCount (pending only)
// observes the following RPC methods:
//   eth_sendRawTransaction


inherits(NonceTrackerSubprovider, Subprovider)

function NonceTrackerSubprovider(opts){
    const self = this

    self.nonceCache = {}
}

var nonceN = 0
var addressN = 0
NonceTrackerSubprovider.prototype.handleRequest = function(payload, next, end){
    const self = this
    switch(payload.method) {

        case 'eth_getTransactionCount':

            var blockTag = blockTagForPayload(payload)

            var address = payload.params[0].toLowerCase()
            var cachedResult = self.nonceCache[address]
            // only handle requests against the 'pending' blockTag
            if (blockTag === 'pending') {
                // has a result
                if (cachedResult) {
                    end(null, cachedResult)
                    // fallthrough then populate cache
                } else {
                    next(function(err, result, cb){
                        if (err) return cb()
                        if (self.nonceCache[address] === undefined) {

                            //add addressN nonceN
                            addressN = address
                            nonceN = ethUtil.bufferToInt(result)

                            self.nonceCache[address] = result
                        }
                        cb()
                    })
                }
            } else {
                next()
            }
            return

        case 'eth_sendRawTransaction':
            // allow the request to continue normally
            next(function(err, result, cb){
                // only update local nonce if tx was submitted correctly
                if (err) return cb()
                // parse raw tx
                // var rawTx = payload.params[0]
                //
                // var stripped = ethUtil.stripHexPrefix(rawTx)
                //
                // var rawData = new Buffer(ethUtil.stripHexPrefix(rawTx), 'hex')

                // var data = Buffer.from(ethUtil.stripHexPrefix(rawTx), 'hex');
                //
                // var tx = new Transaction(new Buffer(ethUtil.stripHexPrefix(rawTx), 'hex'))
                //
                //   // extract address
                // var address = '0x'+tx.getSenderAddress().toString('hex').toLowerCase()
                // extract nonce and increment
                var nonce = nonceN;
                nonce++
                // hexify and normalize
                var hexNonce = nonce.toString(16)
                if (hexNonce.length%2) hexNonce = '0'+hexNonce
                hexNonce = '0x'+hexNonce
                // dont update our record on the nonce until the submit was successful
                // update cache
                self.nonceCache[addressN] = hexNonce

                cb()
            })
            return

        default:
            next()
            return

    }
}
