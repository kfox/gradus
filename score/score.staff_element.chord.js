Score.ChordBegin = function(){}
Score.ChordBegin.prototype = new Score.StaffElement();
Score.ChordBegin.prototype.type = 'ChordBegin';

Score.ChordEnd = function(){}
Score.ChordEnd.prototype = new Score.StaffElement();
Score.ChordEnd.prototype.type = 'ChordEnd';
