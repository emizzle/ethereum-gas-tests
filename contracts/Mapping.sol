// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract Mapping {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    uint public unlockTime;
    address payable public owner;

    struct Simple {
        bytes32 id;
        uint someTime;
        bytes32[] fks;
    }

    mapping(uint => bool) public simpleBool;
    uint public simpleBoolIndex = 0;

    mapping(uint => uint) public simpleUint;
    uint public simpleUintIndex = 0;

    mapping(uint => Simple) public simpleStruct;
    uint public simpleStructIndex = 0;

    mapping(uint => EnumerableSet.Bytes32Set) private enumSet;
    uint public enumSetIndex = 0;

    constructor() {    }

    // SIMPLE CREATE
    function simpleBoolCreate() public {
        simpleBool[simpleBoolIndex++] = true;
    }
    function simpleUintCreate() public {
        simpleUint[simpleUintIndex++] = block.timestamp;
    }
    function simpleStructCreate(bytes32 id, bytes32[] calldata fks) public {
        simpleStruct[simpleStructIndex++] = Simple(id, block.timestamp, fks);
    }

    // ENUM SET CREATE/ADD
    function enumSetCreate() public {
        enumSetIndex = enumSetIndex + 1;
    }
    function enumSetAdd(bytes32 id) public {
        enumSet[enumSetIndex].add(id);
    }

    // DELETE
    function simpleBoolDelete(uint idx) public {
        delete simpleBool[idx];
    }
    function simpleUintDelete(uint idx) public {
        delete simpleUint[idx];
    }
    function simpleStructDelete(uint idx) public {
        delete simpleStruct[idx];
    }

    // ENUM SET DELETE
    function enumSetClear(uint idx) public {
        for (uint i = 0; i<enumSet[idx].length(); i++) {
            enumSet[idx].remove(enumSet[idx].at(i));
        }
    }

    // ENUM SET HELPERS
    function enumSetLength() public view returns (uint) {
        return enumSet[enumSetIndex].length();
    }
}
