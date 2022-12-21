const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { TASK_NODE_GET_PROVIDER } = require("hardhat/builtin-tasks/task-names");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { randomBytes } = ethers.utils;
const colors = require("ansi-colors");

colors.theme({
  danger: colors.red,
  dark: colors.dim.gray,
  disabled: colors.gray,
  em: colors.italic,
  heading: colors.bold.underline,
  info: colors.cyan,
  muted: colors.dim,
  primary: colors.blue,
  strong: colors.bold,
  success: colors.green,
  underline: colors.underline,
  warning: colors.yellow,
});

function speed(durationMs) {
  if (durationMs < 500) {
    return colors.success(durationMs);
  } else if (durationMs < 1000) {
    return colors.warning(durationMs);
  } else {
    return colors.danger(durationMs);
  }
}

describe("Mapping", function () {
  let mapping;
  let gasMin, gasMax;
  let gasAvg, cnt;
  const RUN_FACTOR = process.env.RUN_FACTOR ? process.env.RUN_FACTOR : 3;
  const RUNS = process.env.RUNS
    ? process.env.RUNS
    : 256 * Math.pow(2, RUN_FACTOR);
  const NUM_SETS = process.env.NUM_SETS ? process.env.NUM_SETS : 3;

  this.timeout(0); // disable timeouts https://mochajs.org/#timeouts

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMappingFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Mapping = await ethers.getContractFactory("Mapping");
    mapping = await Mapping.deploy();

    return { mapping, owner, otherAccount };
  }

  function resetAnalyser() {
    cnt = 0;
    gasAvg = 0;
    gasTotal = BigNumber.from(0);
    gasMin = { gasUsed: 0, idx: 0, elapsed: 0 };
    gasMax = { gasUsed: 0, idx: 0, elapsed: 0 };
    timeAvg = 0;
    timeTotal = 0;
    timeMin = { elapsed: 0, idx: 0 };
    timeMax = { elapsed: 0, idx: 0 };
  }

  async function execute(futResp, args) {
    const start = new Date();
    const { hash } = await futResp(...args);
    const stop = new Date();
    return { elapsed: stop - start, hash };
  }

  async function analyse(futResp, args = []) {
    const { elapsed, hash } = await execute(futResp, args);
    const { gasUsed } = await ethers.provider.getTransactionReceipt(hash);
    const used = gasUsed.toNumber();

    if (cnt === 0) {
      // GAS
      gasMin = { used, idx: cnt, elapsed };
      gasMax = {
        used,
        idx: cnt,
        elapsed,
      };
      gasTotal = gasUsed;
      gasAvg = used;

      // TIME
      timeMin = { elapsed, idx: cnt };
      timeMax = { elapsed, idx: cnt };
      timeTotal = BigNumber.from(elapsed);
      timeAvg = elapsed;
    } else {
      // GAS
      if (used < gasMin.used) {
        gasMin = { used, idx: cnt, elapsed };
      }
      if (used > gasMax.used) {
        gasMax = {
          used,
          idx: cnt,
          elapsed,
        };
      }
      gasTotal = gasTotal.add(gasUsed);
      gasAvg = gasTotal.div(cnt + 1).toNumber();

      // TIME
      if (elapsed < timeMin.elapsed) {
        timeMin = { elapsed, idx: cnt };
      }
      if (elapsed > timeMax.elapsed) {
        timeMax = { elapsed, idx: cnt };
      }
      timeTotal = timeTotal.add(BigNumber.from(elapsed));
      timeAvg = timeTotal.div(cnt + 1).toNumber();
    }
    cnt++;
  }

  function report(level = 2) {
    const indent = level * 4;
    console.log(" ".repeat(indent), colors.italic(`Total runs: ${RUNS}`));
    console.log(" ".repeat(indent), colors.bold("Gas Used"));
    console.log(
      " ".repeat(indent),
      colors.dim("min: "),
      colors.info(gasMin.used),
      colors.dim(`(${speed(gasMin.elapsed)}ms, run #${gasMin.idx})`)
    );
    console.log(
      " ".repeat(indent),
      colors.dim("max: "),
      colors.red(gasMax.used),
      colors.dim(`(${speed(gasMax.elapsed)}ms, run #${gasMax.idx})`)
    );
    console.log(
      " ".repeat(indent),
      colors.dim("avg: "),
      colors.yellow(gasAvg),
      colors.dim(`(${speed(timeAvg)}ms)`)
    );
    console.log(" ".repeat(indent), colors.bold("Execution time"));
    console.log(
      " ".repeat(indent),
      colors.dim("min: "),
      colors.info(`${timeMin.elapsed}ms`),
      colors.dim(`(run #${timeMin.idx})`)
    );
    console.log(
      " ".repeat(indent),
      colors.dim("max: "),
      colors.red(`${timeMax.elapsed}ms`),
      colors.dim(`(run #${timeMax.idx})`)
    );
    console.log(
      " ".repeat(indent),
      colors.dim("avg: "),
      colors.yellow(`${timeAvg}ms`)
    );
  }

  describe("Create", function () {
    describe("Simple", function () {
      beforeEach(async function () {
        let f = await loadFixture(deployMappingFixture);
        mapping = f.mapping;
        resetAnalyser();
      });

      afterEach(function () {
        report();
      });

      it("Should create a bool in the mapping", async function () {
        for (let i = 0; i < RUNS; i++) {
          await analyse(mapping.simpleBoolCreate);
        }
        await expect(await mapping.simpleBoolIndex()).to.equal(RUNS);
      });
      it("Should create a uint in the mapping", async function () {
        for (let i = 0; i < RUNS; i++) {
          await analyse(mapping.simpleUintCreate);
        }
        await expect(await mapping.simpleUintIndex()).to.equal(RUNS);
      });
      it("Should create a struct in the mapping ", async function () {
        for (let i = 0; i < RUNS; i++) {
          await analyse(mapping.simpleStructCreate, [
            randomBytes(32),
            [randomBytes(32), randomBytes(32), randomBytes(32)],
          ]);
        }
        await expect(await mapping.simpleStructIndex()).to.equal(RUNS);
      });
    });
    describe("EnumerableSet.Bytes32Set", function () {
      before(async function () {
        let f = await loadFixture(deployMappingFixture);
        mapping = f.mapping;
        resetAnalyser();
      });
      for (let j = 0; j < NUM_SETS; j++) {
        it("Should create value in a bytes32 set in the Bytes32Set", async function () {
          console.log(" ".repeat(8), colors.heading(`Filling set ${j}`));
          for (let i = 0; i < RUNS; i++) {
            await analyse(mapping.enumSetAdd, [randomBytes(32)]);
          }
          await expect(await mapping.enumSetLength()).to.equal(RUNS);
          await expect(await mapping.enumSetIndex()).to.equal(j);
          await mapping.enumSetCreate();

          report();
          resetAnalyser();
          console.log("");
        });
      }
    });
  });

  describe("Delete", function () {
    describe("Simple", function () {
      beforeEach(async function () {
        let f = await loadFixture(deployMappingFixture);
        mapping = f.mapping;
        resetAnalyser();
      });

      afterEach(function () {
        report();
      });
      it("Should delete a bool in the mapping", async function () {
        for (let i = 0; i < RUNS; i++) {
          await mapping.simpleBoolCreate();
        }
        for (let i = 0; i < RUNS; i++) {
          await analyse(mapping.simpleBoolDelete, [i]);
        }
      });
      it("Should delete a uint in the mapping", async function () {
        for (let i = 0; i < RUNS; i++) {
          await mapping.simpleUintCreate();
        }
        for (let i = 0; i < RUNS; i++) {
          await analyse(mapping.simpleUintDelete, [i]);
        }
      });
      it("Should delete a struct in the mapping", async function () {
        for (let i = 0; i < RUNS; i++) {
          await mapping.simpleStructCreate(randomBytes(32), [
            randomBytes(32),
            randomBytes(32),
            randomBytes(32),
          ]);
        }
        for (let i = 0; i < RUNS; i++) {
          await analyse(mapping.simpleStructDelete, [i]);
        }
      });
    });
    describe("EnumerableSet.Bytes32Set", function () {
      beforeEach(async function () {
        let f = await loadFixture(deployMappingFixture);
        mapping = f.mapping;
        resetAnalyser();
      });
      for (let j = 0; j < NUM_SETS; j++) {
        it("Should delete value in a bytes32 set in the Bytes32Set", async function () {
          console.log(" ".repeat(8), colors.heading(`Clearing set ${j}`));
          for (let i = 0; i < RUNS; i++) {
            await analyse(mapping.enumSetClear, [i]);
          }
          await expect(await mapping.enumSetLength()).to.equal(0);

          report();
          resetAnalyser();
          console.log("");
        });
      }
    });
  });
});
