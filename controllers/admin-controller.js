const adminServices = require('../service/admin-service')

const adminController = {
  // 取得 user 資料
  getUsers: (req, res, next) => {
    adminServices.getUsers(req, (err, data) => err ? next(err) : res.status(200).json(data))
  },
  // 顯示所有推文
  getTweets: (req, res, next) => {
    adminServices.getTweets(req, (err, data) => err ? next(err) : res.status(200).json(data))
  },
  // 刪除單一推文
  deleteTweet: (req, res, next) => {
    adminServices.deleteTweet(req, (err, data) => err ? next(err) : res.status(200).json(data))
  }
}

module.exports = adminController
