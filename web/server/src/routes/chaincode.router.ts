import express, { NextFunction } from 'express'
import Boom from 'boom'
import ChaincodeService from '../services/chaincode.service'
var _ = require('underscore')
import validatorHandler from '../middlewares/validator.handler'
import ConnectionParams from 'interfaces/connectionParams.interface'
import Chaincode from '../../../common/Chaincode'
import AdminService from '../services/admin.service'
import DbService from '../services/db.service'
import IPFSService from '../services/ipfs.service'
import { NFT } from '../../../common/nft'
import { arrayBuffer } from 'stream/consumers'
const { getChaincodeEventsSchema } = require('../schemas/hyperledger.schemas')

class ChaincodeRouter {
  router: express.Router
  ccService: ChaincodeService
  dbService: DbService
  adminService: AdminService
  ipfsService: IPFSService
  constructor() {
    this.router = express.Router()
    this.ccService = new ChaincodeService()
    this.dbService = new DbService()
    this.adminService = new AdminService()
    this.ipfsService = new IPFSService()
    _.bindAll(this.ccService, Object.getOwnPropertyNames(Object.getPrototypeOf(this.ccService)))

    this.router.get('/', async (req, res) => {
      const parameters = await this.ccService.displayInputParameters()
      if (parameters) {
        res.json(parameters)
      }
      else {
        res.send('No connection parameters provided.')
      }
    })

    this.router.get('/events/:block',
      async (request, response, next) => {
        validatorHandler(getChaincodeEventsSchema, request.params.block)
        try {
          const { block } = request.params
          const blockInt: bigint = BigInt(block) ?? 0
          const parameters = await this.ccService.GetChaincodeEvents(blockInt)
          response.json(parameters)
        }
        catch (error) {
          next(error)
        }
      })

    this.router.post('/mint', async (req, res, next) => {
      try {
        const chaincode = req.body as Chaincode
        const orgId = chaincode.organization
        console.log('Recovering credentials....', orgId)
        let config = await this.dbService.GetConfig(orgId)
        console.log('config file recovered', config)
        const walletUrl = config.organizations[orgId].walletUrl as string
        const wallet = await this.adminService.buildWallet(undefined, walletUrl)
        const nftToken : NFT = <NFT>chaincode.params
        var arr = JSON.parse(req.body.data) as Array<number>
        var arrBuffer = new Uint8Array(arr)
        console.log('Generating IPFS File...')
        const ipfsResult = await this.ipfsService.addFile(nftToken.FileName!,arrBuffer.buffer)
        nftToken.URI = ipfsResult.cid.toString()
        console.log('executing contract...')
        const result = await this.ccService.mint(config, wallet, chaincode.userId, chaincode.channel, chaincode.name, nftToken)
        res.send(result)
        res.status(200)
      }
      catch (error) {
        next(error)
      }
    })

    this.router.post('/chaincode', async (req, res, next) => {
      try {
        const cc = req.body as Chaincode
        const orgId = cc.organization
        let config = await this.dbService.GetConfig(orgId)
        const walletUrl = config.organizations[orgId].walletUrl as string
        console.log('config',config)
        const wallet = await this.adminService.buildWallet(undefined, walletUrl)
        const parms = Object.values(cc.params) as string[]
        const result = await this.ccService.chaincode('Read', config, wallet, cc.userId, cc.channel, cc.name, cc.functionName, ...parms)
        res.send(result)
      }
      catch (error) {
        next(error)
      }
    })

    this.router.post('/chaincode', async (req, res, next) => {
      try {
        console.log('Into /nft/chaincode')
        const cc = req.body as Chaincode
        const orgId = cc.organization
        let config = await this.dbService.GetConfig(orgId)
        const walletUrl = config.organizations[orgId].walletUrl as string
        const wallet = await this.adminService.buildWallet(undefined, walletUrl)
        const parms = Object.values(cc.params) as string[]
        const result = await this.ccService.chaincode('Write', config, wallet, cc.userId, cc.channel, cc.name, cc.functionName, ...parms)
        res.send(result)
      }
      catch (error) {
        next(error)
      }
    })
  }
}
export default ChaincodeRouter
