
function noteToUInt32(note) {
  var u = (note.type == 'Note' ? note.ord(true) : 0);
  u = u | (note.ticks() << 8);
  return u;
}

function translate(note, semitones) {
  var p = pitch(note) + semitones;
  return (note & 0xffffff00) | p;
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

function consonances(note) {
  if (rest(note))
    return [];
  switch((pitch(note)-21) % 12) {
  case 0:
    return [0, 3, -4, 7, -7, 8, -9];
  case 2:
    return [0, 3, -4, -7, 8, -9];
  case 3:
    return [0, 4, -3, 7, -7, 9, -8];
  case 5:
    return [0, 3, -3, 7, -7, 9, -9];
  case 7:
    return [0, 3, -4, 7, -7, 8, -9];
  case 8:
    return [0, 4, -3, 7, 9, -8];
  case 10:
    return [0, 4, -3, 7, -7, 9, -8];
  default:
    return [];
  }
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
