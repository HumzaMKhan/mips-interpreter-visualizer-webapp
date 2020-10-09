"use strict";

import {OPCODES, REGISTERS, PSEUDO_OPS} from './constants.js';
import {syntaxError} from './parser.js';
export {assemblyToMachine, };

// convert an instruction from assembly to machine code
function assemblyToMachine(lineNumber, instructionAddress, instruction) {
    // format of the instruction should be an array of fields starting with opcode
    let opcode = instruction[0], immediate, jumpDistance;

    if(PSEUDO_OPS.includes(opcode)) {
        switch(opcode) {
            case 'li': // li rd imm --> addiu rd $zero imm
                opcode = 'addiu';
                instruction.splice(2, 0, '$zero');
                break;
            case 'move': // move rd, rt --> addu rd, $zero, rt
                opcode = 'addu';
                instruction.splice(2, 0, '$zero');
                break;
            case 'neg': // neg rd, rt --> sub rd, $zero, rt
                opcode = 'sub';
                instruction.splice(2, 0, '$zero');
                break;
        }
    }

    if(!(opcode in OPCODES)) return syntaxError(lineNumber, 'This instruction does not have a valid opcode');

    switch(opcode) {
        // R-Type: 6op 5rs 5rt 5rd 5shamt 6funct
            // op rd, rs, rt
        case 'add': case 'addu': case 'and': case 'nor': case 'or': case 'slt': case 'sltu': case 'sub': case 'subu': case 'xor':
            if(instruction.length != 4) return syntaxError(lineNumber, 'This instruction requires 3 parameters');
            if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS && instruction[3] in REGISTERS)) return syntaxError(lineNumber, 'All 3 parameters should be valid registers');
            return REGISTERS[instruction[2]] << 21 | REGISTERS[instruction[3]] << 16 | REGISTERS[instruction[1]] << 11 | OPCODES[opcode][1];
            // op rd, rt, rs
        case 'sllv': case 'srav': case 'srlv':
            if(instruction.length != 4) return syntaxError(lineNumber, 'This instruction requires 3 parameters');
            if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS && instruction[3] in REGISTERS)) return syntaxError(lineNumber, 'All 3 parameters should be valid registers');
            return REGISTERS[instruction[3]] << 21 | REGISTERS[instruction[2]] << 16 | REGISTERS[instruction[1]] << 11 | OPCODES[opcode][1];
            // op rd, rt, sa
        case 'sll': case 'sra': case 'srl':
            if(instruction.length != 4) return syntaxError(lineNumber, 'This instruction requires 3 parameters');
            if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS)) return syntaxError(lineNumber, 'Both parameters should be valid registers');
            if(instruction[3] > 0b11111 || instruction[3] < 0) return syntaxError(lineNumber, 'Shift amount cannot be more than 31 or less than 0');
            return REGISTERS[instruction[2]] << 16 | REGISTERS[instruction[1]] << 11 | instruction[3] << 6 | OPCODES[opcode][1];
            // op rs, rt
        case 'div': case 'divu': case 'mult': case 'multu':
            if(instruction.length != 3) return syntaxError(lineNumber, 'This instruction requires 2 parameters');
            if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS)) return syntaxError(lineNumber, 'Both parameters should be valid registers');
            return REGISTERS[instruction[1]] << 21 | REGISTERS[instruction[2]] << 16 | OPCODES[opcode][1];
            // op rd, rs | op rs
        case 'jalr':
            if(instruction.length == 3) {
                if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS)) return syntaxError(lineNumber, 'Both parameters should be valid registers');
                return REGISTERS[instruction[2]] << 21 | REGISTERS[instruction[1]] << 11 | OPCODES[opcode][1];
            }
            else if(instruction.length == 2) {
                if(!(instruction[1] in REGISTERS)) return syntaxError(lineNumber, 'The parameter should be a valid register');
                return REGISTERS[instruction[1]] << 21 | 0b11111 << 11 | OPCODES[opcode][1];
            }
            else return syntaxError(lineNumber, 'This instruction requires either 1 or 2 parameters');
            // op rs
        case 'jr': case 'mthi': case 'mtlo':
            if(instruction.length != 2) return syntaxError(lineNumber, 'This instruction requires 1 parameter');
            if(!(instruction[1] in REGISTERS)) return syntaxError(lineNumber, 'The parameter should be a valid register');
            return REGISTERS[instruction[1]] << 21 | OPCODES[opcode][1];
            // op rd
        case 'mfhi': case 'mflo':
            if(instruction.length != 2) return syntaxError(lineNumber, 'This instruction requires 1 parameter');
            if(!(instruction[1] in REGISTERS)) return syntaxError(lineNumber, 'The parameter should be a valid register');
            return REGISTERS[instruction[1]] << 11 | OPCODES[opcode][1];
            // op
        case 'syscall': case 'break': case 'nop':
            if(instruction.length != 1) return syntaxError(lineNumber, 'This instruction requires 0 parameters');
            return OPCODES[opcode][1];
        
        // I-type 6op 5rs 5rt 16imm
            // op rt, rs, imm
        case 'addi': case 'addiu': case 'andi': case 'ori': case 'slti': case 'sltiu': case 'xori':
            if(instruction.length != 4) return syntaxError(lineNumber, 'This instruction requires 3 parameters');
            if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS)) return syntaxError(lineNumber, 'First two parameters should be valid registers');
            if(instruction[3] > 32767 || instruction[3] < -32768) return syntaxError(lineNumber, "Immediate value is not representable within 2's complement 16 bits");
            immediate = instruction[3] & 0xffff;
            return OPCODES[opcode] << 26 | REGISTERS[instruction[2]] << 21 | REGISTERS[instruction[1]] << 16 | immediate;
            // op rs, rt, label *** Label has been converted to it's memory location prior to this function being called
        case 'beq': case 'bne':
            if(instruction.length != 4) return syntaxError(lineNumber, 'This instruction requires 3 parameters');
            if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS)) return syntaxError(lineNumber, 'First two parameters should be valid registers');
            jumpDistance = (instruction[3] - instructionAddress) / 4;
            if(jumpDistance > 32767 || jumpDistance < -32768) return syntaxError(lineNumber, "Branching distance is not representable within 2's complement 16 bits (the label is too far away)");
            immediate = jumpDistance & 0xffff;
            return OPCODES[opcode] << 26 | REGISTERS[instruction[1]] << 21 | REGISTERS[instruction[2]] << 16 | immediate;
            // op rs, label *** Label has been converted to it's memory location prior to this function being called
        case 'bgez': case 'bgtz': case 'blez': case 'bltz': case 'bgezal': case 'bltzal':
            if(instruction.length != 3) return syntaxError(lineNumber, 'This instruction requires 2 parameters');
            if(!(instruction[1] in REGISTERS)) return syntaxError(lineNumber, 'First parameter should be a valid register');
            jumpDistance = (instruction[2] - instructionAddress) / 4;
            if(jumpDistance > 32767 || jumpDistance < -32768) return syntaxError(lineNumber, "Branching distance is not representable within 2's complement 16 bits (the label is too far away)");
            immediate = jumpDistance & 0xffff;
            return OPCODES[opcode] << 26 | REGISTERS[instruction[1]] << 21 | immediate;
            // op rt, imm(rs) --> op rt, rs, imm
        case 'lb': case 'lbu': case 'lh': case 'lhu': case 'lw': case 'sb': case 'sh': case 'sw':
            if(instruction.length != 3) return syntaxError(lineNumber, 'This instruction requires 3 parameters');
            let lparen = instruction[2].indexOf('(');
            let rparen = instruction[2].indexOf(')');
            if(lparen == -1 || rparen == -1) return syntaxError(lineNumber, 'Bad formatting: this instruction is formatted like this: mnemonic register immediate(register)');
            instruction.push(instruction[2].slice(0, lparen));
            instruction[2] = instruction[2].slice(lparen + 1, rparen);
            
            if(!(instruction[1] in REGISTERS && instruction[2] in REGISTERS)) return syntaxError(lineNumber, 'Register parameters are not valid registers');
            let offset = instruction[3];
            if(offset > 32767 || offset < -32768) return syntaxError(lineNumber, "Offset amount is not representable within 2's complement 16 bits (the immediate is too large)");
            immediate = offset & 0xffff;
            return (OPCODES[opcode] << 26 | REGISTERS[instruction[2]] << 21 | REGISTERS[instruction[1]] << 16 | immediate) >>> 0;
            // op rt, imm
        case 'lui':
            if(instruction.length != 3) return syntaxError(lineNumber, 'This instruction requires 2 parameters');
            if(!(instruction[1] in REGISTERS)) return syntaxError(lineNumber, 'First parameter should be a valid register');
            if(instruction[2] > 32767 || instruction[2] < -32768) return syntaxError(lineNumber, "Immediate value is not representable within 2's complement 16 bits");
            immediate = instruction[2] & 0xffff;
            return OPCODES[opcode] << 26 | REGISTERS[instruction[1]] << 16 | immediate;
        
        // J-Type op, label *** Label has been converted to it's memory location prior to this function being called
        case 'j': case 'jal':
            if(instruction.length != 2) return syntaxError(lineNumber, 'This instruction requires 1 parameter');
            let target = (instruction[2] >>> 2) & 0b11_1111_1111_1111_1111_1111_1111;
            return OPCODES[opcode] << 26 | target;
    }

    return number;
}