const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { User, Tweet, Reply, Like, Followship } = require('../models')
const { imgurFileHandler } = require('../helpers/file-helpers')
const helpers = require('../_helpers')
const userServices = require('../service/user-service')

const userController = {
  // 登入驗證成功後的動作
  signIn: (req, res, next) => {
    userServices.signIn(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 註冊帳號
  signUp: (req, res, next) => {
    userServices.signUp(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 取得某 user 的資料
  getUserInfo: (req, res, next) => {
    userServices.getUserInfo(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 更新 notify 狀態
  patchNotification: (req, res, next) => {
    userServices.patchNotification(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 更新 user 個人資料
  putUser: (req, res, next) => {
    userServices.putUser(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 取得某 user 發的所有推文
  getTweets: (req, res, next) => {
    userServices.getTweets(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 取得某 user 發的所有回覆
  getReplies: (req, res, next) => {
    userServices.getReplies(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 取得某 user 所有的 like 記錄
  getLikes: (req, res, next) => {
    userServices.getLikes(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 取得某 user 所有 follow 的人
  getFollowings: (req, res, next) => {
    userServices.getFollowings(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 取得某 user 所有的追隨者
  getFollowers: (req, res, next) => {
    userServices.getFollowers(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // follow 某 user
  addFollowing: (req, res, next) => {
    userServices.addFollowing(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 取消 follow 某 user
  removeFollowing: (req, res, next) => {
    userServices.removeFollowing(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 取得 follower 前十多的 user
  getTopFollowing: (req, res, next) => {
    userServices.getTopFollowing(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 增加 like 記錄
  addLike: (req, res, next) => {
    userServices.addLike(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  },
  // 刪除 like 記錄
  removeLike: (req, res, next) => {
    userServices.removeLike(req, (err, data) => { err ? next(err) : res.status(200).json(data) })
  }
}

module.exports = userController
