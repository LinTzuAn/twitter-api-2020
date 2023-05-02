const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { User, Tweet, Reply, Like, Followship, sequelize } = require('../models')
const { imgurFileHandler } = require('../helpers/file-helpers')
const helpers = require('../_helpers')

const userServices = {
  // 登入驗證成功後的動作
  signIn: (req, cb) => {
    try {
      const userData = req.user.toJSON()
      delete userData.password
      const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '30d' })
      cb(null, { success: true, data: { token, user: userData } })
    } catch (err) {
      cb(err)
    }
  },
  // 註冊帳號
  signUp: async (req, cb) => {
    try {
      if (req.body.name.length > 50) throw new Error('name 字數大於 50')

      const [emailResult, accountResult] = await Promise.all([
        User.findOne({ where: { email: req.body.email } }),
        User.findOne({ where: { account: req.body.account } })
      ])

      if (emailResult && accountResult) throw new Error('email 與 account 都重複註冊！')
      if (emailResult) throw new Error('email 已重複註冊！')
      if (accountResult) throw new Error('account 已重複註冊！')

      const hash = bcrypt.hashSync(req.body.password, 10)
      const createdUser = await User.create({
        account: req.body.account,
        name: req.body.name,
        email: req.body.email,
        password: hash,
        role: 'user'
      })
      const result = createdUser.toJSON()
      delete result.password // 避免不必要資料外洩
      cb(null, { success: true, user: result })
    } catch (err) {
      cb(err)
    }
  },
  // 取得某 user 的資料
  getUserInfo: async (req, cb) => {
    try {
      const currentUser = helpers.getUser(req).id
      const user = await User.findByPk(req.params.id, {
        attributes: {
          include: [
            [sequelize.literal(`( SELECT COUNT(*) FROM Followships WHERE follower_id = ${currentUser} AND following_id = ${req.params.id}  )`), 'isFollowing'],
            [sequelize.literal(`( SELECT COUNT(*) FROM Followships WHERE follower_id = ${currentUser} AND following_id = ${req.params.id}  )`), 'isNotified']
          ],
          exclude: ['password']
        }
      })
      if (!user) throw new Error('Can not find this user.')
      cb(null, user)
    } catch (err) {
      cb(err)
    }
  },
  // 更新 notify 狀態
  patchNotification: async (req, cb) => {
    try {
      const currentUser = helpers.getUser(req)
      const followship = await Followship.findOne({
        where: {
          followerId: currentUser.id,
          followingId: req.params.id
        }
      })
      if (!followship) throw new Error("You haven't follow this user.")
      const result = await followship.update({ isNotified: !followship.isNotified })
      cb(null, { success: true, result })
    } catch (err) {
      cb(err)
    }
  },
  // 更新 user 個人資料
  putUser: async (req, cb) => {
    try {
      const id = Number(req.params.id)
      const oldPW = helpers.getUser(req).password
      if (helpers.getUser(req).id !== id) {
        return cb(null, {
          success: false,
          message: 'Sorry. You do not own this account.'
        })
      }
      // 檢驗每個 key/value
      for (const key in req.body) {
        if (!req.body[key].trim()) throw new Error(`${key} 不能輸入空白`)
      }
      const { files } = req // 上傳多個檔時，會改擺在 req.files
      let { account, email, password } = req.body
      if (account === helpers.getUser(req).account) {
        account = undefined
      }
      if (email === helpers.getUser(req).email) {
        email = undefined
      }
      const upload = {}
      for (const key in files) {
        upload[key] = { path: files[key][0].path }
      }
      const [imagePath, avatarPath, user, sameAcc, sameMail, samePW] = await Promise.all([
        imgurFileHandler(upload.image),
        imgurFileHandler(upload.avatar),
        User.findByPk(id),
        // (下1) false 要擺 account 根本不存在 (不更動 account) 的狀況
        account ? User.findOne({ where: { account } }) : undefined,
        email ? User.findOne({ where: { email } }) : undefined,
        password ? bcrypt.compare(password, oldPW) : true
      ])
      if (!user) throw new Error("User doesn't exist!")
      if (sameAcc) throw new Error('account 已重複註冊！')
      if (sameMail) throw new Error('email 已重複註冊！')
      if (samePW) {
        req.body.password = oldPW
      } else {
        req.body.password = bcrypt.hashSync(password, 10)
      }
      req.body.account = account
      req.body.email = email
      req.body.image = imagePath || user.image
      req.body.avatar = avatarPath || user.avatar
      let updatedUser = await user.update(req.body)
      updatedUser = updatedUser.toJSON()
      delete updatedUser.password
      cb(null, updatedUser)
    } catch (err) {
      cb(err)
    }
  },
  // 取得某 user 發的所有推文
  getTweets: async (req, cb) => {
    try {
      const currentUser = helpers.getUser(req).id
      const tweet = await Tweet.findAll({
        where: { UserId: req.params.id },
        attributes: {
          include: [
            [sequelize.literal(`( SELECT COUNT(*) FROM Likes WHERE Likes.tweet_id = Tweet.id AND Likes.user_id = ${currentUser})`), 'liked'],
            [sequelize.literal(`( SELECT COUNT(*) FROM Likes WHERE Likes.tweet_id = Tweet.id )`), 'likesCount'],
            [sequelize.literal(`( SELECT COUNT(*) FROM Replies WHERE Replies.tweet_id = Tweet.id )`), 'repliesCount']
          ]
        },
        order: [['createdAt', 'DESC'], ['id', 'ASC']]
      })
      cb(null, tweet)
    } catch (err) {
      cb(err)
    }
  },
  // 取得某 user 發的所有回覆
  getReplies: async (req, cb) => {
    try {
      const replies = await Reply.findAll({
        where: { UserId: req.params.id },
        include: {
          model: Tweet,
          attributes: [],
          include: {
            model: User,
            attributes: ['account']
          }
        },
        raw: true,
        nest: true,
        order: [['createdAt', 'DESC']]
      })
      cb(null, replies)
    } catch (err) {
      cb(err)
    }
  },
  // 取得某 user 所有的 like 記錄
  getLikes: async (req, cb) => {
    try {
      const currentUser = helpers.getUser(req).id
      const likes = await Like.findAll({
        where: { UserId: req.params.id },
        include: {
          model: Tweet,
          attributes: [
            'description',
            [sequelize.literal(`( SELECT COUNT(*) FROM Likes WHERE Likes.tweet_id = Tweet.id )`), 'likesCount'],
            [sequelize.literal(`( SELECT COUNT(*) FROM Replies WHERE Replies.tweet_id = Tweet.id )`), 'repliesCount'],
            [sequelize.literal(`( SELECT COUNT(*) FROM Likes WHERE Likes.tweet_id = Tweet.id AND Likes.user_id = ${currentUser} )`), 'currentUserLikes']
          ],
          include: [{
            model: User,
            attributes: [
              'id',
              'name',
              'account',
              'avatar'
            ]
          }],
          order: [['createdAt', 'DESC']]
        }
      })
      if (!likes) throw new Error('Cannot find this record.')
      cb(null, likes)
    } catch (err) {
      cb(err)
    }
  },
  // 取得某 user 的追蹤中
  getFollowings: async (req, cb) => {
    try {
      const currentUser = helpers.getUser(req).id
      const user = await User.findByPk(req.params.id, {
        attributes: [],
        include: {
          model: User,
          as: 'Followings',
          attributes: [
            'name',
            'avatar',
            'introduction',
            [sequelize.literal(`( SELECT following_id FROM Followships WHERE following_id = Followings.id AND follower_id = User.id )`), 'followingId'],
            [sequelize.literal(`( SELECT COUNT(following_id) FROM Followships WHERE following_id = Followings.id AND follower_id = ${currentUser} )`), 'currentUserIsFollowing'],
            [sequelize.literal(`( SELECT created_at FROM Followships WHERE following_id = Followings.id AND follower_id = User.id )`), 'followshipCreatedAt']
          ],
          through: {
            attributes: []
          }
        },
        order: [
          [{ model: User, as: 'Followings' }, 'createdAt', 'DESC']
        ]
      })
      if (!user) throw new Error('Cannot find this user.')
      cb(null, user.Followings)
    } catch (err) {
      cb(err)
    }
  },
  // 取得某 user 的追隨者
  getFollowers: async (req, cb) => {
    try {
      const currentUser = helpers.getUser(req).id || 1
      const user = await User.findByPk(req.params.id, {
        attributes: [],
        include: {
          model: User,
          as: 'Followers',
          attributes: [
            'id',
            'name',
            'avatar',
            'introduction',
            [sequelize.literal(`( SELECT follower_id FROM Followships WHERE follower_id = Followers.id AND following_id = User.id )`), 'followerId'],
            [sequelize.literal(`( SELECT COUNT(following_id) FROM Followships WHERE following_id = Followers.id AND follower_id = ${currentUser} )`), 'currentUserIsFollowing'],
            [sequelize.literal(`( SELECT created_at FROM Followships WHERE follower_id = Followers.id AND following_id = User.id )`), 'followshipCreatedAt']
          ],
          through: {
            attributes: []
          }
        },
        order: [
          [{ model: User, as: 'Followers' }, 'createdAt', 'DESC']
        ]
      })
      if (!user) throw new Error('Cannot find this user.')
      cb(null, user.Followers)
    } catch (err) {
      cb(err)
    }
  },
  // follow 某 user
  addFollowing: async (req, cb) => {
    try {
      const followingId = Number(req.body.id) // 要 follow 的對象
      const currentUser = helpers.getUser(req).id
      const followRecord = await Followship.findOne({
        where: {
          followerId: currentUser,
          followingId
        }
      })
      if (followRecord) {
        const err = new Error('you already followed this user.')
        err.status = 409
        throw err
      }
      const user = await User.findByPk(followingId)
      if (!user) {
        const err = new Error('Cannot find this user')
        err.status = 404
        throw err
      }
      if (followingId === currentUser) throw new Error('不能追蹤自己')
      const addedRecord = await Followship.create({
        followerId: currentUser,
        followingId
      })
      cb(null, { success: true, result: addedRecord })
    } catch (err) {
      cb(err)
    }
  },
  // 取消 follow 某 user
  removeFollowing: async (req, cb) => {
    try {
      const { followingId } = req.params
      const followRecord = await Followship.findOne({
        where: {
          followerId: helpers.getUser(req).id,
          followingId
        }
      })
      if (!followRecord) throw new Error('Cannot find this record.')
      const deletedRecord = followRecord.destroy()
      cb(null, { success: true, deletedRecord })
    } catch (err) {
      cb(err)
    }
  },
  // 取得 follower 前十多的 user
  getTopFollowing: async (req, cb) => {
    try {
      const users = await User.findAll({
        where: { role: 'user' },
        attributes: [
          'id',
          'email',
          'account',
          'name',
          [sequelize.literal(`( SELECT COUNT(*) FROM Followships WHERE following_id = User.id)`), 'followerCount']
        ],
        include: [{
          model: User,
          as: 'Followers',
          attributes: [],
          through: {
            attributes: []
          }
        }],
        order: [
          [sequelize.literal('followerCount'), 'DESC']
        ],
        limit: 10
      })
      cb(null, { success: true, users })
    } catch (err) {
      cb(err)
    }
  },
  // 增加 like 記錄
  addLike: async (req, cb) => {
    try {
      const [tweet, user] = await Promise.all([
        Tweet.findByPk(req.params.id),
        User.findByPk(helpers.getUser(req).id)
      ])
      if (!tweet) throw new Error('Tweet does not exist.')
      if (!user) throw new Error('User does not exsit.')
      const likeRecord = await Like.create({
        TweetId: tweet.id,
        UserId: user.id
      })
      cb(null, { success: true, likeRecord })
    } catch (err) {
      cb(err)
    }
  },
  // 刪除 like 記錄
  removeLike: async (req, cb) => {
    try {
      const TweetId = req.params.id
      const currentUser = helpers.getUser(req).id
      const like = await Like.findOne({
        where: {
          UserId: currentUser,
          TweetId
        }
      })
      if (!like) throw new Error('We can not find this like record.')
      const deletedRecord = await like.destroy()
      cb(null, { success: true, deletedRecord })
    } catch (err) {
      cb(err)
    }
  }
}

module.exports = userServices
