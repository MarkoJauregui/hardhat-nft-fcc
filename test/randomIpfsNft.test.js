const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Random IPFS NFT Unit Tests", function() {
      let randomIpfsNft, deployer, vrfCoordinatorV2Mock

      beforeEach(async () => {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        await deployments.fixture(["mocks", "randomipfs"])
        randomIpfsNft = await ethers.getContract("RandomIpfsNft")
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
      })

      describe("constructor", () => {
        it("sets starting values correctly", async () => {
          const dogTokenUriZero = await randomIpfsNft.getDogTokenUris(0)
          const isInitialized = await randomIpfsNft.getInitialized()
          assert(dogTokenUriZero.includes("ipfs://"))
          assert.equal(isInitialized, true)
        })
      })

      describe("requestNft", () => {
        it("fails if payment isn't sent with request", async () => {
          await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
            "RandomIpfsNft__NeedMoreETHSent"
          )
        })

        it("reverts if the payment is less than the mint fee", async () => {
          await expect(
            randomIpfsNft.requestNft({
              value: ethers.utils.parseEther("0.000000000000000001")
            })
          ).to.be.revertedWith("RandomIpfsNft__NeedMoreETHSent")
        })

        it("emits an event and kicks off a random word request", async () => {
          const fee = await randomIpfsNft.getMintFee()
          await expect(randomIpfsNft.requestNft({ value: fee.toString() })).to.emit(
            randomIpfsNft,
            "NftRequested"
          )
        })
      })
      describe("fulfillRandomWords", () => {
        it("mints NFT after random number is returned", async function() {
          await new Promise(async (resolve, reject) => {
            randomIpfsNft.once("NftMinted", async () => {
              try {
                const tokenUri = await randomIpfsNft.tokenURI("0")
                const tokenCounter = await randomIpfsNft.getTokenCounter()
                assert.equal(tokenUri.toString().includes("ipfs://"), true)
                assert.equal(tokenCounter.toString(), "1")
                resolve()
              } catch (e) {
                console.log(e)
                reject(e)
              }
            })
            try {
              const fee = await randomIpfsNft.getMintFee()
              const requestNftResponse = await randomIpfsNft.requestNft({
                value: fee.toString()
              })
              const requestNftReceipt = await requestNftResponse.wait(1)
              await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestNftReceipt.events[1].args.requestId,
                randomIpfsNft.address
              )
            } catch (error) {
              console.log(error)
              reject(error)
            }
          })
        })
      })

      describe("getBreedFromModdedRng", () => {
        it("should return a pug if moddedRng < 10", async () => {
          const expectedValue = await randomIpfsNft.getBreedFromModdedRng(6)
          assert.equal(0, expectedValue)
        })

        it("should return a shiba if moddedRng is between 10 - 39", async () => {
          const expectedValue = await randomIpfsNft.getBreedFromModdedRng(20)
          assert.equal(1, expectedValue)
        })

        it("should return a St.Bernard if moddedRng is between 40 - 99", async () => {
          const expectedValue = await randomIpfsNft.getBreedFromModdedRng(70)
          assert.equal(2, expectedValue)
        })

        it("should revert if value is over 99", async () => {
          await expect(randomIpfsNft.getBreedFromModdedRng(100)).to.be.revertedWith(
            "RandomIpfsNft__RangeOutOfBounds"
          )
        })
      })
    })
