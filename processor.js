"use strict"
import {TEXT_START_ADDRESS, DATA_START_ADDRESS} from './constants.js';
import {parseCode, getLabels} from './parser.js';
export {updateMemoryTable, updateRegisterTable, previousMemory, nextMemory, setMemory, assemble, reset, restart, run, step};

let breakReturn;
let memoryAddress;
let executionLine;
let lastLine;
let labels;
let memory;
let preExecutionMemory;
let breakpoints;
let registers;
let hilo;

function assemble(code) {
    executionLine = 1;
    breakpoints = new Uint32Array();
    registers.fill(0);
    hilo.fill(0);
    memoryAddress = DATA_START_ADDRESS;

    preExecutionMemory = parseCode(code);
    if(preExecutionMemory == -1) return; // assembly failed
    lastLine = preExecutionMemory[1];
    preExecutionMemory = preExecutionMemory[0];
    memory = preExecutionMemory;
    updateMemoryTable(DATA_START_ADDRESS);
    labels = getLabels();
}

function reset() {
    breakReturn = 0;
    memoryAddress = DATA_START_ADDRESS;
    executionLine = 1;
    lastLine = 1;
    labels = {};
    memory = {};
    preExecutionMemory = {};
    breakpoints = new Uint32Array();
    registers = new Uint32Array(32).fill(0);
    hilo = new Uint32Array(2).fill(0);

    memory[TEXT_START_ADDRESS] = 65;
    memory[TEXT_START_ADDRESS + 1] = 32;
    memory[TEXT_START_ADDRESS + 2] = 67;
    memory[TEXT_START_ADDRESS + 3] = 10;
    
    memory[DATA_START_ADDRESS + 40] = 65;
    memory[DATA_START_ADDRESS + 41] = 32;
    memory[DATA_START_ADDRESS + 42] = 67;
    memory[DATA_START_ADDRESS + 43] = 10;
}

function restart() {
    memoryAddress = DATA_START_ADDRESS;
    executionLine = 1;
    memory = preExecutionMemory;
    registers.fill(0);
    hilo.fill(0);
}

function run() {
    do {
        if(executionLine + TEXT_START_ADDRESS in breakpoints) {
            if(breakReturn) breakReturn = 0;
            else return 0;
        }
    } while(!step());
    return 1;
}

function step() {
    if(executionLine >= lastLine) return 0;
    breakReturn = 0;
    return runInstruction(memory[TEXT_START_ADDRESS + executionLine++]);
}

function setBreakpoint(address) {
    breakpoints.push(address);
}

function removeBreakpoint(address) {
    breakpoints.splice(breakpoints.indexOf(address), 1); // we can assume that the element is in the array
}

function previousMemory() {
    memoryAddress -= 40;
    updateMemoryTable();
}

function nextMemory() {
    memoryAddress += 40;
    updateMemoryTable();
}

function setMemory(address) {
    memoryAddress = address;
    updateMemoryTable();
}

function updateMemoryTable() {
    let value, ascii, htmlTable = '', memByte;
    for(let i = 0; i < 10; i++) {
        value = 0;
        ascii = '';
        for(let j = 3; j >= 0; j--) {
            memByte = memory[memoryAddress + i*4 + j] || 0;
            if(memByte == 0) ascii += '\\0 ';
            else if(memByte == 10) ascii += '\\n ';
            else ascii += ' ' + String.fromCharCode(memByte) + ' ';

            if(memoryAddress + i*4 + j in memory) value += memByte;
            if(j != 0) value <<= 8;
        }
        htmlTable += '<tr><td>' + '0x' + (memoryAddress + i*4).toString(16).padStart(8, '0') + '</td><td>'+ value.toString(10) + '</td><td>' + '0x' + value.toString(16).padStart(8, '0') + '</td><td><pre>' + ascii + '</pre></td></tr>';
    }
    document.getElementById('memoryBody').innerHTML = htmlTable;
}

function updateRegisterTable() {
    let htmlTable = '', firstRowValues = ['$zero', '$at  ', '$v0  ', '$v1  ', '$a0  ', '$a1  ', '$a2  ', '$a3  ', '$t0  ', '$t1  ', '$t2  ', '$t3  ', '$t4  ', '$t5  ', '$t6  ', '$t7  ', '$s0  ', '$s1  ', '$s2  ', '$s3  ', '$s4  ', '$s5  ', '$s6  ', '$s7  ', '$t8  ', '$t9  ', '$k0  ', '$k1  ', '$gp  ', '$sp  ', '$fp  ', '$ra  '];
    for(let i = 0; i < 32; i++) htmlTable += '<tr><td>' + firstRowValues[i] + '</td><td>' + '$' + i.toString(10) + '</td><td>' + registers[i].toString(10) + '</td><td>' + '0x' + registers[i].toString(16).padStart(8, '0') + '</td></tr>';
    document.getElementById('registersBody').innerHTML = htmlTable;
}

// create a runtime error message
function runTimeError(executionLine, ...args) {
    document.getElementById('output').innerHTML = 'Line ' + executionLine + ': RUNTIME ERROR (failed to execute):\n' + args.join('\n') + '\n';
    return -1; // runtime errors are fatal
}

function runInstruction(instruction) {
    // R-Type instructions
    // |opcode|rs|rt|rd|shamt|funct|
    // I-Type instructions
}