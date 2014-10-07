
Score.Theory = {
  mode: []
};

(function() {
  var dorian = [2, 1, 2, 2, 2, 1, 2];
  var pitches = {
    'A': 21, 'B': 23, 'C': 24, 'D': 26, 'E': 28, 'F': 29, 'G': 31
  };

  var base, mode, pitch;
  for (var tonic in pitches) {
    base = pitches[tonic];
    if (typeof base == 'undefined')
      continue;
    mode = Score.Theory[tonic+'_DORIAN'] = [];

    i = 0;
    pitch = base;
    while (pitch <= 108) {
      mode.push(pitch);
      pitch += dorian[i]
      i = (i + 1) % 7;
    }
  }

})();

Score.Theory.mode = Score.Theory.D_DORIAN;

function noteToUInt32(note) {
  var u = (note.type == 'Note' ? note.ord(true) : 0);
  u = u | (note.ticks() << 8);
  return u;
}

function translate(note, semitones) {
  var p = pitch(note) + semitones;
  return (note & 0xffffff00) | p;
}

function naturalTranslate(note, interval) {
  var p = pitch(note);
  var i = Score.Theory.mode.indexOf(p);

  if (rest(note))
    return note;

  if (i == -1)
    throw "couldn't locate scale degree of "+pitch(note);

  return (duration(note) << 8) | Score.Theory.mode[i+interval];
}

function duration(note) {
  return (note & 0xffffff00) >> 8;
}

function pitch(note) {
  return (note & 0x000000ff);
}

function rest(note) {
  return pitch(note) == 0;
}

function interval(n1, n2) {
  return pitch(n1) - pitch(n2);
}

function unison(interval) {
  return !interval;
}

function perfect(interval) {
  interval = Math.abs(interval) % 12;
  switch(interval) {
  case 0:
    // unison / octave
  case 7:
    // perfect fifth
    return true;
  default:
    return false;
  }
}

function consonant(interval) {
  interval = Math.abs(interval) % 12;
  switch(interval) {
  case 0:
    // unison
  case 3:
    // minor 3rd
  case 4:
    // major 3rd
  case 7:
    // perfect 5th
  case 8:
    // minor 6th
  case 9:
    // major 6th
    return true;
  default:
    return false;
  }
}

function dissonant(interval) {
  return !consonant(interval);
}

function tritone(interval) {
  return interval == 6;
}

function range(voice) {
  var low = 0, high = 0;
  for (var p, i=0; i < voice.length; ++i) {
    if (rest(voice[i]))
      continue;
    p = pitch(voice[i]);
    if (low == 0)
      low = high = p;
    else if (p < low)
      low = p;
    else if (p > high)
      high = p;
  }
  return high - low;
}

function adjacencies(voice) {
  var pairs = [];
  for (var i=1; i < voice.length; ++i)
    if (!rest(voice[i-1]) && !rest(voice[i]))
      pairs.push([voice[i-1], voice[i]])
  return pairs;
}
