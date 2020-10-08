"use strict"
import {TEXT_START_ADDRESS, DATA_START_ADDRESS, FUNCTS, REVERSE_OPS, REVERSE_RT, TEXT_END_ADDRESS} from './constants.js';
import {parseCode} from './parser.js';
export {
    updateMemoryTable, updateRegisterTable,
    previousMemory, nextMemory, showAddress, showTextSegment, showDataSegment, showStack, showGlobal,
    assemble, reset, restart, run, step
};

let memoryAddress = DATA_START_ADDRESS;
let labels = {};
let memory = {};
let preExecutionValues = {};
let registers = new Int32Array(32).fill(0);
let hilo = new Int32Array(2).fill(0);
let pc = TEXT_START_ADDRESS;
let exitAddress = TEXT_END_ADDRESS;

function addOutput(...args) {
    document.getElementById('output').innerHTML += args.join('\n') + '\n';
}

function setOutput(...args) {
    document.getElementById('output').innerHTML = args.join('\n') + '\n';
}

// create a runtime error message
function runTimeError(...args) {
    setOutput('Address ' + '0x' + pc.toString(16).padStart(8, '0') + ': RUNTIME ERROR (failed to execute):', ...args);
    return -1; // runtime errors are fatal
}

function runInstruction(instruction) {
    console.log(instruction.toString(2).padStart(32, '0'));
    // set all potential fields
    let funct =     (instruction)        & 0b11_1111;
    let shamt =     (instruction >>> 6)  & 0b1111;
    let rd =        (instruction >>> 11) & 0b1111;
    let imm =       (instruction)        & 0xffff;
    let signextendimm = ((imm >> 15) & 1 == 1) ? imm | 0xffff0000 : imm >>> 0;
    let zeroextendimm = imm >>> 0;
    let rt =        (instruction >>> 16) & 0b1111;
    let rs =        (instruction >>> 21) & 0b1111;
    let target =    (instruction)        & 0b11_1111_1111_1111_1111_1111_1111;
    let opcode =    (instruction >>> 26);
    
    console.log(opcode.toString(2).padStart(6, '0'), rs.toString(2).padStart(5, '0'), rt.toString(2).padStart(5, '0'), signextendimm.toString(2).padStart(16, '0'));
    // R-Type 6op 5rs 5rt 5rd 5shamt 6funct
    if(opcode == 0b000000) {
        switch(FUNCTS[funct]) {
            case 'add':     // rd = rs + rt, trap on overflow
                if(registers[rs] + registers[rt] > 2147483647 || registers[rs] + registers[rt] < -2147483648) return runTimeError('Overflow error');
                registers[rd] = registers[rs] + registers[rt];
                return 1;
            case 'addu':    // rd = rs + rt, no exceptions
                registers[rd] = (registers[rs] + registers[rt]) & 0xffff_ffff;
                return 1;
            case 'sub':     // rd = rs - rt, trap on overflow
                if(registers[rs] - registers[rt] > 2147483647 || registers[rs] - registers[rt] < -2147483648) return runTimeError('Overflow error');
                registers[rd] = registers[rs] - registers[rt];
                return 1;
            case 'subu':    // rd = rs - rt, no exceptions
                registers[rd] = registers[rs] - registers[rt];
                return 1;
            case 'div':     // lo = rs / rt, hi = rs % rt, divide by zero UNPREDICTABLE
                if(registers[rt] == 0) return runTimeError('Divide by zero error', 'Technically this is not an error, but a warning for UNPREDICTABLE behaviour in the MIPS spec');
                hilo[0] = Math.floor(registers[rs] / registers[rt]);
                hilo[1] = registers[rs] % registers[rt];
                return 1;
            case 'divu':    // lo = rs / rt, hi = rs % rt, operands are unsigned, divide by zero UNPREDICTABLE
                if(registers[rt] == 0) return runTimeError('Divide by zero error', 'Technically this is not an error, but a warning for UNPREDICTABLE behaviour in the MIPS spec');
                hilo[0] = Math.floor((registers[rs] >>> 0) / (registers[rt] >>> 0));
                hilo[1] = (registers[rs] >>> 0) % (registers[rt] >>> 0);
                return 1;
            case 'mult':    // {hi, lo} = rs * rt, no exceptions
                hilo[0] = ((registers[rs] >>> 0) * (registers[rt] >>> 0)) & 0xffff_ffff;
                hilo[1] = (((registers[rs] >>> 0) * (registers[rt] >>> 0)) >>> 32) & 0xffff_ffff;
                return 1;
            case 'multu':   // {hi, lo} = rs * rt, operands are unsigned, no exceptions
                hilo[0] = ((registers[rs] >>> 0) * (registers[rt] >>> 0)) & 0xffff_ffff;
                hilo[1] = (((registers[rs] >>> 0) * (registers[rt] >>> 0)) >>> 32) & 0xffff_ffff;
                return 1;
            case 'mflo':    // rd = lo, no exceptions
                registers[rd] = hilo[0];
                return 1;
            case 'mtlo':    // lo = rs, no exceptions
                hilo[0] = registers[rs];
                return 1;
            case 'mfhi':    // rd = hi, no exceptions
                registers[rd] = hilo[1];
                return 1;
            case 'mthi':    // hi = rs, no exceptions
                hilo[1] = registers[rs];
                return 1;
            case 'and':     // rd = rs & rt, no exceptions
                registers[rd] = registers[rs] & registers[rt];
                return 1;
            case 'or':      // rd = rs | rt, no exceptions
                registers[rd] = registers[rs] | registers[rt];
                return 1;
            case 'xor':     // rd = rs ^ rt, no exceptions
                registers[rd] = registers[rs] ^ registers[rt];
                return 1;
            case 'nor':     // rd = ~(rs | rt), no exceptions
                registers[rd] = ~(registers[rs] | registers[rt]);
                return 1;
            case 'sll':     // rd = rt << shamt, no exceptions
                registers[rd] = registers[rt] << shamt;
                return 1;
            case 'sllv':    // rd = rt << (rs & 0b1_1111), no exceptions
                registers[rd] = registers[rt] << (registers[rs] & 0b1_1111);
                return 1;
            case 'srl':     // rd = rt >>> shamt, no exceptions
                registers[rd] = registers[rt] >>> shamt;
                return 1;
            case 'srlv':    // rd = rt >>> (rs & 0b1_1111), no exceptions
                registers[rd] = registers[rt] >>> (registers[rs] & 0b1_1111);
                return 1;
            case 'sra':     // rd = rt >> shamt, no exceptions
                registers[rd] = registers[rt] >> shamt;
                return 1;
            case 'srav':    // rd = rt >> (rs & 0b1_1111), no exceptions
                registers[rd] = registers[rt] >> (registers[rs] & 0b1_1111);
                return 1;
            case 'slt':     // rd = (rs < rt) ? 1 : 0, no exceptions
                registers[rd] = (registers[rs] < registers[rt]) ? 1 : 0;
                return 1;
            case 'sltu':    // rd = (rs < rt) ? 1 : 0, operands are unsigned, no exceptions
                registers[rd] = ((registers[rs] >>> 0) < (registers[rt] >>> 0)) ? 1 : 0;
                return 1;
            case 'jr':      // pc = rs, operands are unsigned, no exceptions
                pc = registers[rs];
                return 1;
            case 'jalr':    // rd = pc + 4; pc = rs
                registers[rd] = pc + 4;
                pc = registers[rs] >>> 0;
                return 1;
            case 'nop':     // do nothing
                return 1;
            case 'break':   // breakpoint
                return -2;
            case 'syscall': // call a system service based on the number in $v0, sometimes output to other registers
                switch(register[2]) { // $v0
                    case 10: // exit
                        return 0;
                }
                return 1; // successful syscall
        }
    }
    // J-Type 6op 26target
    else if(opcode == 0b000010) { // j target
        // pc = ((pc + 4) & 0xf000_0000) | (target << 2)
        pc = ((pc + 4) & 0xf000_0000) | (target << 2);
    }
    else if(opcode == 0b000011) { // jal target
        // $ra = pc + 4
        // pc = ((pc + 4) & 0xf000_0000) | (target << 2)
        registers[31] = pc + 4;
        pc = ((pc + 4) & 0xf000_0000) | (target << 2);
    }
    // I-Type 6op 5rs 5rt 16imm
    else {
        if(!(opcode in REVERSE_OPS)) {
            switch(REVERSE_RT[rt]) {
                case 'bltz':    // branch <  0
                case 'bgez':    // branch >= 0
                case 'bltzal':  // branch <  0 and link for return
                case 'bgezal':  // branch >= 0 and link for return
            }
        }
        else {
            switch(REVERSE_OPS[opcode]) {
                case 'addi':    // rt = rs + signextend(imm), trap on overflow
                    if(registers[rs] + signextendimm > 2147483647 || registers[rs] + signextendimm < -2147483648) return runTimeError('Overflow error');
                    registers[rt] = registers[rs] + signextendimm;
                    return 1;
                case 'addiu':   // rt = rs + signextend(imm), no exceptions
                    console.log(rt, rs, signextendimm, (registers[rs] + signextendimm) & 0xffff_ffff);
                    registers[rt] = (registers[rs] + signextendimm) & 0xffff_ffff;
                    return 1;
                case 'andi':    // rt = rs & zeroextend(imm), no exceptions
                    registers[rt] = registers[rs] & zeroextendimm;
                    return 1;
                case 'ori':     // rt = rs | zeroextend(imm), no exceptions
                    registers[rt] = registers[rs] | zeroextendimm;
                    return 1;
                case 'xori':    // rt = rs ^ zeroextend(imm), no exceptions
                    registers[rt] = registers[rs] ^ zeroextendimm;
                    return 1;
                case 'lw':      // rt = mem[rs + signextend(imm)], load 4 bytes, word misalignment will cause an error
                case 'lh':      // rt = mem[rs + signextend(imm)], load 2 bytes, halfword misalignment will cause an error
                case 'lhu':     // rt = mem[rs + signextend(imm)], load 2 bytes unsigned, halfword misalignment will cause an error
                case 'lb':      // rt = mem[rs + signextend(imm)], load 1 byte, no exceptions
                case 'lbu':     // rt = mem[rs + signextend(imm)], load 1 byte unsigned, no exceptions
                case 'lui':     // rt = imm << 16, no exceptions
                case 'sw':      // mem[rs + signextend(imm)] = rt, store 4 bytes, word misalignment will cause an error
                case 'sh':      // mem[rs + signextend(imm)] = rt, store 2 bytes, halfword misalignment will cause an error
                case 'sb':      // mem[rs + signextend(imm)] = rt, store 1 byte, no exceptions
                case 'beq':     // branch == 0
                case 'bne':     // branch != 0
                case 'bgtz':    // branch >  0
                case 'bgez':    // branch >= 0
                case 'bgezal':  // branch >= 0 and link for return
                case 'bltz':    // branch <  0
                case 'bltzal':  // branch <  0 and link for return
                case 'blez':    // branch <= 0
                case 'slti':    // rt = (rs < signextend(imm)) ? 1 : 0, no exceptions
                    registers[rt] = (registers[rs] < signextend(imm)) ? 1 : 0;
                    return 1;
                case 'sltiu':   // rt = (rs < signextend(imm)) ? 1 : 0, no exceptions
                    registers[rt] = ((registers[rs] >>> 0) < (signextend(imm) >>> 0)) ? 1 : 0;
                    return 1;
            }
        }
    }
}

function assemble(code) {
    preExecutionValues = parseCode(code); // [labels, memory, exitAddress, startAddress]
    if(preExecutionValues == -1) return; // assembly failed
    setOutput('Assembly successful!', 'Press Run to start the program, or step to advance one instruction.');

    labels = preExecutionValues[0];
    memory = preExecutionValues[1];
    exitAddress = preExecutionValues[2];
    pc = preExecutionValues[3];
    
    registers.fill(0);
    hilo.fill(0);
    updateRegisterTable();

    memoryAddress = DATA_START_ADDRESS;
    updateMemoryTable();
}

function reset() {
    memoryAddress = DATA_START_ADDRESS;
    labels = {};
    memory = {};
    preExecutionValues = {};
    registers.fill(0);
    hilo.fill(0);
    pc = TEXT_START_ADDRESS;
    exitAddress = TEXT_END_ADDRESS;
    updateRegisterTable();
    updateMemoryTable();

    setOutput('Reset successful!', 'Press Assemble to begin.');
}

function restart() {
    // put values back to what they were at the start of execution
    labels = preExecutionValues[0];
    memory = preExecutionValues[1];
    exitAddress = preExecutionValues[2];
    pc = preExecutionValues[3];
    
    registers.fill(0);
    hilo.fill(0);
    updateRegisterTable();

    memoryAddress = DATA_START_ADDRESS;
    updateMemoryTable();

    setOutput('Restart successful!', 'Press Run to start the program, or step to advance one instruction.');
}

function run() {
    setOutput('Running . . .');

    let stepReturnCode;
    do {
        stepReturnCode = step(); // -2: breakpoint encountered, -1: runtime error, 0: execution complete, 1: no exceptions
    } while(step());
    
    if(stepReturnCode == -2) document.getElementById('output').innerHTML += 'Breakpoint encountered...';

    return stepReturnCode;
}

function step() {
    if(pc > exitAddress) return 0;
    if(pc % 4 != 0) return runTimeError('Bad pc value:' + '0x' + pc.toString(16).padStart(8, '0') + ', must be aligned to word boundry.');
    if(pc > TEXT_END_ADDRESS) return runTimeError('Bad pc value:' + '0x' + pc.toString(16).padStart(8, '0') + ', the pc has overrun the text segment boundry.');
    if(pc < TEXT_START_ADDRESS) return runTimeError('Bad pc value:' + '0x' + pc.toString(16).padStart(8, '0') + ', the pc has underrun the text segment boundry.');

    addOutput('Running instruction at 0x' + pc.toString(16).padStart(8, '0'));
    let stepReturnCode = runInstruction(memory[pc]);  // -2: breakpoint encountered, -1: runtime error, 0: execution complete, 1: no exceptions
    if(stepReturnCode == 0) addOutput('Execution complete!');
    pc += 4;
    updateRegisterTable();
    updateMemoryTable();

    return stepReturnCode;
}

function previousMemory() {
    memoryAddress -= 40;
    updateMemoryTable();
}

function nextMemory() {
    memoryAddress += 40;
    updateMemoryTable();
}

function showAddress(address) { // ADDRESS WILL LIKELY BE INPUTTED IN HEX, NEED TO CONVERT
    if(address < 67108864 || address > 2147483648) { // DO SOMETHING TO INDICATE INVALID ADDRESS
        return -1;
    }
    memoryAddress = address;
    updateMemoryTable();
}

function showTextSegment() {
    memoryAddress = TEXT_START_ADDRESS;
    updateMemoryTable();
}

function showDataSegment() {
    memoryAddress = DATA_START_ADDRESS;
    updateMemoryTable();
}

function showStack() {
    memoryAddress = registers[29] >>> 0;
    updateMemoryTable();
}

function showGlobal() {
    memoryAddress = registers[28] >>> 0;
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
    htmlTable += '<tr><td>' + 'pc' + '</td><td>' + 'NA' + '</td><td>' + pc.toString(10) + '</td><td>' + '0x' + pc.toString(16).padStart(8, '0') + '</td></tr>';
    for(let i = 0; i < 32; i++) htmlTable += '<tr><td>' + firstRowValues[i] + '</td><td>' + '$' + i.toString(10) + '</td><td>' + registers[i].toString(10) + '</td><td>' + '0x' + registers[i].toString(16).padStart(8, '0') + '</td></tr>';
    htmlTable += '<tr><td>' + 'hi' + '</td><td>' + 'NA' + '</td><td>' + hilo[1].toString(10) + '</td><td>' + '0x' + hilo[1].toString(16).padStart(8, '0') + '</td></tr>';
    htmlTable += '<tr><td>' + 'lo' + '</td><td>' + 'NA' + '</td><td>' + hilo[0].toString(10) + '</td><td>' + '0x' + hilo[0].toString(16).padStart(8, '0') + '</td></tr>';
    document.getElementById('registersBody').innerHTML = htmlTable;
}