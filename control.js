"use strict"

import {
    updateMemoryTable, updateRegisterTable,
    previousMemory, nextMemory, showAddress, showTextSegment, showDataSegment, showStack, showGlobal,
    assemble, reset, restart, run, step
} from './processor.js';

// persist code on refresh, adapted from https://stackoverflow.com/questions/17591447/how-to-reload-current-page-without-losing-any-form-data
window.onbeforeunload = function() {
    localStorage.setItem('code', $('#code').val());
}
window.onload = function() {
    let code = localStorage.getItem('code');
    if(code !== null) $('#code').val(code);
}

// add line numbers to the textareas
$(document).ready(function(){
    $('.lined').linedtextarea();
});

// flip the disabled attribute of every button in buttons
function disableButtons(...buttons) {
    for(let i = 0, buttonsLength = buttons.length; i < buttonsLength; i++) document.getElementById(buttons[i]).disabled = true;
}
function enableButtons(...buttons) {
    for(let i = 0, buttonsLength = buttons.length; i < buttonsLength; i++) document.getElementById(buttons[i]).disabled = false;
}

// initially display memory and registers
updateMemoryTable();
updateRegisterTable();

// disable buttons which need other buttons to be pressed first
disableButtons('reset', 'restart', 'run', 'step');

// add functionality to all of the buttons
// under code
document.querySelector('#assemble').addEventListener('click', function() {
    assemble(document.getElementById('code').value);    // assemble the input code
    disableButtons('assemble');                         // reset must be pressed to allow reassembly
    enableButtons('reset', 'restart', 'run', 'step');   // enable buttons which need assemble to be pressed first
});
document.querySelector('#reset').addEventListener('click', function() {
    // enable assemble to be pressed, but not buttons which need assemble to be pressed first
    disableButtons('reset', 'restart', 'run', 'step');
    enableButtons('assemble');
    reset()
});
document.querySelector('#run').addEventListener('click', function() {
    disableButtons('reset', 'restart', 'run', 'step');
    let runStatus = run();
    if(runStatus == 0) enableButtons('reset', 'restart');
    else               enableButtons('reset', 'restart', 'run', 'step');
});
document.querySelector('#step').addEventListener('click', step);
document.querySelector('#restart').addEventListener('click', function() {
    restart();
    enableButtons('run', 'step');
});
// memory navigation
document.querySelector('#previousMemory').addEventListener('click', previousMemory);
document.querySelector('#nextMemory').addEventListener('click', nextMemory);
document.querySelector('#textSegment').addEventListener('click', showTextSegment);
document.querySelector('#dataSegment').addEventListener('click', showDataSegment);
document.querySelector('#stackPointer').addEventListener('click', showStack);
document.querySelector('#globalPointer').addEventListener('click', showGlobal);