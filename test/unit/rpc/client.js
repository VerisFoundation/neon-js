import RPCClient from '../../../src/rpc/client'
import Query from '../../../src/rpc/query'
import { DEFAULT_RPC, NEO_NETWORK, RPC_VERSION } from '../../../src/consts'
import mockData from './mockData.json'

describe('RPC Client', function () {
  describe('Config', function () {
    it('net', () => {
      const client1 = new RPCClient(NEO_NETWORK.MAIN)
      client1.net.should.equal(DEFAULT_RPC.MAIN)
      const client2 = new RPCClient(NEO_NETWORK.TEST)
      client2.net.should.equal(DEFAULT_RPC.TEST)
      const customURL = 'http://localhost:8080'
      const client3 = new RPCClient(customURL)
      client3.net.should.equal(customURL)
    })

    it('version', () => {
      const client1 = new RPCClient(NEO_NETWORK.MAIN, '1.0.0')
      client1.version.should.equal('1.0.0')
      const client2 = new RPCClient(NEO_NETWORK.TEST)
      client2.version.should.equal(RPC_VERSION)
      const client3 = () => new RPCClient(NEO_NETWORK.MAIN, 'a.b.c')
      client3.should.throw()
    })
  })

  describe('Methods', function () {
    let client
    let mock
    before(() => {
      mock = setupMock(mockData.query)
      mock.onPost().reply(200, {
        'jsonrpc': '2.0',
        'id': 1234,
        'error': {
          'code': -32601,
          'message': 'Method not found'
        }
      })
    })

    after(() => {
      mock.restore()
    })
    beforeEach(() => {
      client = new RPCClient(NEO_NETWORK.TEST)
    })

    it('execute correctly', () => {
      return client.execute(Query.getBlock(1))
        .should.eventually.be.fulfilled
        .then(() => {
          client.history.length.should.equal(1)
        })
    })

    it('query correctly', () => {
      return client.query({ method: 'getblock', params: [1, 1] })
        .should.eventually.be.fulfilled
        .then(() => {
          client.history.length.should.equal(1)
        })
    })

    it('getVersion updates version', () => {
      return client.getVersion()
        .should.eventually.be.fulfilled
        .then((ver) => {
          ver.should.equal('2.3.4')
          client.version.should.equal('2.3.4')
        })
    })
  })

  describe('Errors', function () {
    let client
    let mock

    beforeEach(() => {
      client = new RPCClient(NEO_NETWORK.TEST)
      mock = setupMock()
    })

    afterEach(() => {
      mock.restore()
    })

    it('error when timeout', () => {
      mock.onPost().timeout()

      return client.getBestBlockHash()
        .should.eventually.be.rejected
        .then((err) => {
          err.message.should.include('timeout')
        })
    })

    it('error when invalid method', () => {
      mock.onPost().reply(200, {
        'jsonrpc': '2.0',
        'id': 3,
        'error': {
          'code': -32601,
          'message': 'Method not found'
        }
      })
      return client.query({ method: 'getweird' })
        .should.eventually.be.rejected
        .then((err) => {
          err.message.should.equal('Method not found')
        })
    })

    it('error when invalid method for version', () => {
      client.version = '2.3.2'
      return client.invokeScript('ababab')
        .should.eventually.be.rejected
        .then((err) => {
          err.message.should.include('implemented')
        })
    })
  })
})
