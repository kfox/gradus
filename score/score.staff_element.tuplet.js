Score.TupletBegin = function(){};
Score.TupletBegin.prototype = new Score.StaffElement();
Score.TupletBegin.prototype.type = 'TupletBegin';

Score.TupletEnd = function(){};
Score.TupletEnd.prototype = new Score.StaffElement();
Score.TupletEnd.prototype.type = 'TupletEnd';
