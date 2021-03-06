const assertRevert = require('./helpers/assertRevert')

const Authorizable = artifacts.require('./mocks/AuthorizableMock.sol')


contract('Authorizable', accounts => {

  let authorizable
  let owner = accounts[0]
  let authorizedLevel1 = accounts[1]
  let authorizedLevel5 = accounts[2]
  let authorizedLevel64 = accounts[3]
  let authorizedLevel114 = accounts[4]

  async function isSuccess(sender, number) {
    await authorizable['setTestVariable' + number]({from: sender})
    assert.equal(await authorizable.testVariable(), number)
  }

  async function isRevert(sender, number) {
    await assertRevert(authorizable['setTestVariable' + number]({from: sender}))
  }

  function totalAuthorized(authorized, expectedAuthorized) {
    authorized = authorized.valueOf()
    let count = 0
    for (let a of authorized) {
      if (!/^[0x]*$/.test(a)) {
        count++
      }
    }
    return count == expectedAuthorized
  }

  before(async () => {
    authorizable = await Authorizable.new()
  })

  it('should be inactive', async () => {
    let _authorized = await authorizable.getAuthorized()
    assert.equal(_authorized.length, 0)
  })

  it('should revert trying to set an authorizerLevel > maxLevel', async () => {
    await assertRevert(authorizable.setLevels(128, 256))
  })

  it('should revert trying to set maxLevel to 0', async () => {
    await assertRevert(authorizable.setLevels(0, 0))
  })

  it('should set the default levels', async () => {
    assert.equal(await authorizable.maxLevel(), 64)
    assert.equal(await authorizable.authorizerLevel(), 56)
    await authorizable.setLevels(128, 96)
    assert.equal(await authorizable.maxLevel(), 128)
    assert.equal(await authorizable.authorizerLevel(), 96)
  })

  it('should authorize authorizedLevel1', async () => {
    await authorizable.authorize(authorizedLevel1, 1)
    assert.equal(await authorizable.authorized(authorizedLevel1), 1)
    assert.equal((await authorizable.getAuthorized()).length, 1)
  })

  it('should move authorizedLevel1 to level 2 and again to level 1', async () => {
    await authorizable.authorize(authorizedLevel1, 2)
    assert.equal(await authorizable.authorized(authorizedLevel1), 2)
    await authorizable.authorize(authorizedLevel1, 1)
    assert.equal(await authorizable.authorized(authorizedLevel1), 1)
  })

  it('should deauthorize authorizedLevel1 and authorize it again', async () => {
    await authorizable.authorize(authorizedLevel1, 0)
    assert.equal(await authorizable.authorized(authorizedLevel1), 0)
    await authorizable.authorize(authorizedLevel1, 1)
    assert.equal(await authorizable.authorized(authorizedLevel1), 1)
    assert.equal((await authorizable.getAuthorized()).length, 1)
  })

  it('should revert trying to set the default levels again', async () => {
    await assertRevert(authorizable.setLevels(1024, 960))
  })

  it('should authorize authorizedLevel5', async () => {
    await authorizable.authorize(authorizedLevel5, 5)
    assert.equal(await authorizable.authorized(authorizedLevel5), 5)
    assert.equal((await authorizable.getAuthorized()).length, 2)
  })

  it('should authorize authorizedLevel114', async () => {
    await authorizable.authorize(authorizedLevel114, 114)
    assert.equal(await authorizable.authorized(authorizedLevel114), 114)
    assert.equal((await authorizable.getAuthorized()).length, 3)
  })

  it('should allow authorizedLevel114 to authorize authorizedLevel64', async () => {
    await authorizable.authorize(authorizedLevel64, 64, {from: authorizedLevel114})
    assert.equal(await authorizable.authorized(authorizedLevel64), 64)
    assert.equal((await authorizable.getAuthorized()).length, 4)
  })

  it('should revert if authorizedLevel64 tries to authorize accounts[5]', async () => {
    await assertRevert(authorizable.authorize(accounts[5], 64, {from: authorizedLevel64}))
  })

  it('should allow authorizedLevel5 to verify that it is authorized', async () => {
    assert.isTrue(await authorizable.amIAuthorized({from: authorizedLevel5}))
  })

  it('should allow accounts[6] to verify that it is not authorized', async () => {
    assert.isFalse(await authorizable.amIAuthorized({from: accounts[6]}))
  })

  // owner

  it('should revert if calling setTestVariable1, 2, 3, 7 and 9 from owner', async () => {
    await isRevert(owner, 1)
    await isRevert(owner, 2)
    await isRevert(owner, 3)
    await isRevert(owner, 7)
    await isRevert(owner, 9)
  })

  it('should call setTestVariable4, 5, 6 and 8 from owner', async () => {
    await isSuccess(owner, 4)
    await isSuccess(owner, 5)
    await isSuccess(owner, 6)
    await isSuccess(owner, 8)
  })

  // authorizedLevel1

  it('should call setTestVariable1, 4 and 7 from authorizedLevel1', async () => {
    await isSuccess(authorizedLevel1, 1)
    await isSuccess(authorizedLevel1, 4)
    await isSuccess(authorizedLevel1, 7)
  })

  it('should revert if calling setTestVariable2, 3, 5, 6, 8 and 9 from authorizedLevel1', async () => {
    await isRevert(authorizedLevel1, 2)
    await isRevert(authorizedLevel1, 3)
    await isRevert(authorizedLevel1, 5)
    await isRevert(authorizedLevel1, 6)
    await isRevert(authorizedLevel1, 8)
    await isRevert(authorizedLevel1, 9)
  })

  // authorizedLevel5

  it('should call setTestVariable1 to 6 from authorizedLevel5', async () => {
    await isSuccess(authorizedLevel5, 1)
    await isSuccess(authorizedLevel5, 2)
    await isSuccess(authorizedLevel5, 3)
    await isSuccess(authorizedLevel5, 4)
    await isSuccess(authorizedLevel5, 5)
    await isSuccess(authorizedLevel5, 6)
  })

  // authorizedLevel64

  it('should call setTestVariable9 authorizedLevel64', async () => {
    await isSuccess(authorizedLevel64, 9)
  })

  // authorizedLevel114

  it('should call setTestVariable8 authorizedLevel114', async () => {
    await isSuccess(authorizedLevel114, 8)
  })

  it('should allow authorizedLevel114 to deAuthorize authorizedLevel64', async () => {
    await authorizable.authorize(authorizedLevel64, 0, {from: authorizedLevel114})
    assert.equal(await authorizable.authorized(authorizedLevel64), 0)
  })

  it('should add level 1 to selfRevokeExceptions', async () => {
    await authorizable.addSelfRevokeException(1, true)
    assert.isTrue(await authorizable.selfRevokeException(1))
  })

  it('should revert if authorizedLevel1 tries to deAuthorize itself', async () => {
    await assertRevert(authorizable.deAuthorize({from: authorizedLevel1}))
  })

  it('should remove level 1 to selfRevokeExceptions', async () => {
    await authorizable.addSelfRevokeException(1, false)
    assert.isFalse(await authorizable.selfRevokeException(1))
  })

  it('should allow authorizedLevel1 to deAuthorize itself', async () => {
    await authorizable.deAuthorize({from: authorizedLevel1})
    assert.equal(await authorizable.authorized(authorizedLevel1), 0)
  })

  it('should set selfRevoke to false', async () => {
    await authorizable.setSelfRevoke(false)
    assert.isFalse(await authorizable.selfRevoke())
  })

  it('should revert if authorizedLevel5 tries to deAuthorize itself', async () => {
    await assertRevert(authorizable.deAuthorize({from: authorizedLevel5}))
  })


  it('should revert if calling setTestVariable1 from authorizedLevel1', async () => {
    await isRevert(authorizedLevel1, 1)
  })

  it('should revert if calling getAuthorized from authorizedLevel1', async () => {
    await assertRevert(authorizable.getAuthorized({from: authorizedLevel1}))
  })

  it('should authorize accounts 5..9 in batch', async () => {
    assert.isTrue(totalAuthorized(await authorizable.getAuthorized(), 2))
    await authorizable.authorizeBatch([accounts[5], accounts[6], accounts[7], accounts[8], accounts[9]], 5)
    assert.isTrue(totalAuthorized(await authorizable.getAuthorized(), 7))
  })

  it('should de-authorize all wallets at level 5', async () => {
    await authorizable.deAuthorizeAllAtLevel(5)
    assert.isTrue(totalAuthorized(await authorizable.getAuthorized(), 1))
  })

  it('should allow owner to deAuthorizeAll in two steps', async () => {
    await authorizable.authorizeBatch([authorizedLevel5, accounts[5], accounts[6], accounts[7], accounts[8], accounts[9]], 5)
    await authorizable.deAuthorizeAll({gas: 120000})
    let _authorized = await authorizable.getAuthorized()
    assert.equal(_authorized[3], 0)
    assert.equal(_authorized[4], accounts[7])
    await authorizable.deAuthorizeAll({gas: 120000})
    _authorized = await authorizable.getAuthorized()
    for (let a of _authorized) {
      assert.equal(a, 0)
    }
  })

  it('should reset the default levels', async () => {
    await authorizable.setLevels(32, 28)
    assert.equal(await authorizable.maxLevel(), 32)
    assert.equal(await authorizable.authorizerLevel(), 28)
  })


})
