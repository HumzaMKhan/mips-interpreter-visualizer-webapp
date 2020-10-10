"use strict"

import {
    updateMemoryTable, updateRegisterTable,
    previousMemory, nextMemory, showAddress, showTextSegment, showDataSegment, showStack, showGlobal,
    assemble, reset, restart, run, step
} from './processor.js';

// add line numbers to the textareas
$(document).ready(function(){
    $('.lined').linedtextarea();
});

// flip the disabled attribute of every button in buttons
function flipButtons(...buttons) {
    for(let i = 0, buttonsLength = buttons.length; i < buttonsLength; i++) document.getElementById(buttons[i]).disabled = !document.getElementById(buttons[i]).disabled;
}

// initially display memory and registers
updateMemoryTable();
updateRegisterTable();

// disable buttons which need other buttons to be pressed first
flipButtons('reset', 'restart', 'run', 'step');

// add functionality to all of the buttons
document.querySelector('#restart').addEventListener('click', restart);
document.querySelector('#run').addEventListener('click', function() {
    flipButtons('reset', 'restart', 'run', 'step');
    let runStatus = run();
    console.log(runStatus);
    if(runStatus == 0) flipButtons('reset', 'restart');
    else               flipButtons('reset', 'restart', 'run', 'step');
});
document.querySelector('#step').addEventListener('click', step);
document.querySelector('#previousMemory').addEventListener('click', previousMemory);
document.querySelector('#nextMemory').addEventListener('click', nextMemory);
document.querySelector('#textSegment').addEventListener('click', showTextSegment);
document.querySelector('#dataSegment').addEventListener('click', showDataSegment);
document.querySelector('#stackPointer').addEventListener('click', showStack);
document.querySelector('#globalPointer').addEventListener('click', showGlobal);
document.querySelector('#assemble').addEventListener('click', function() {
    assemble(document.getElementById('code').value);            // assemble the input code
    flipButtons('assemble', 'reset', 'restart', 'run', 'step'); // enable buttons which need assemble to be pressed first
});
document.querySelector('#reset').addEventListener('click', function() {
    flipButtons('assemble', 'reset', 'restart', 'run', 'step'); // allow assemble to be pressed, but not buttons which need assemble to be pressed first
    reset()
});