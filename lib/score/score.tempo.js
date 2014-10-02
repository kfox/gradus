
Score.Tempo = function(value) {
  var match = value.match(/(\d\/\d)\s*=\s*(\d+)/);
  if (!match)
    throw 'Invalid tempo: '+value;

  var bpm = parseInt(match[2]);
  switch(match[1]) {
  case '1/2':
    this._bpm = 2 * bpm;
    break;
  case '1/4':
    this._bpm = bpm;
    break;
  case '1/8':
    this._bpm = bpm / 2;
    break;
  case '1/16':
    this._bpm = bpm / 4;
    break;
  }
};

Score.Tempo.prototype.bpm = function(value) {
  switch(value) {
  case '1/2':
    return this._bpm / 2;
  case '1/4':
    return this._bpm;
  case '1/8':
    return this._bpm * 2;
  case '1/16':
    return this._bpm * 4;
  }
};
