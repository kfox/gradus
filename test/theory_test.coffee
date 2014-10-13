should = chai.should()


describe 'uint32 craziness', ->
  it 'should encode a note and duration in ticks as a uint32', -> 
    # noteToUInt32(Note).should.eql "blah"
    
  it 'should store the duration in ticks', ->
    

describe 'intervals', ->
  it 'should treat a fifth as perfect', -> 
    perfect(7).should.equal true
    
  it 'should treat an octave as perfect', ->
    perfect(12).should.equal true
    
  it 'should treat unison as perfect', ->
    perfect(0).should.equal true

  it 'should calculate intervals by semitone', ->
    interval(24, 22).should.equal 2
    

describe "utilities", ->
  it 'should calculate range of a voice by semitones', ->
    range([24, 29 ,21]).should.eql 8
    
  it 'should return pairs of adjacent notes', ->
    adjacencies([24,29,21]).should.eql [[24,29], [29,21]]