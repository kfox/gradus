## Features

### 0.1 (basic prototype)

* Provides one of many cancti firmi
* Allows input of counterpoint by mouse, directly on the staves. You can input anywhere, not limited to "the next empty place"
* Allows notes to be clicked and dragged to be moved up or down on the stave (not left/right though, fuck that)
* Press play to hear the two voices in shitty midi
* After note input, writes the interval above the canctus firmus stave in a small font to help you out
* Big button that turns on "hyper-gradus": Calculates and shows you the next available notes in .5 opacity across the whole cf, those options update and are constrained as more notes are entered.


### 1.0 and beyond

* The rest of the species, with a toggle switch to change species mid-input
* Lets you "lock" input to only notes obeying the rules
* When not locked to input, shows you which rules were broken (!?)
* Lets you open a pane to specific toggle rules on/off


## Prototype constraints

Let's not make this too hard on ourselves...

* Both cantus and counterpoint in treble clef
* Let`s stick with 11 bars as a standard length to start
* Let's provide Cantus Firmus in lower voice only for now (it can also be the upper)
* First species only, but prepare for the next species


## Definitions 

```
Intervals
  Dissonant
    Second, Fourth, Tritone, Seventh (plus octave versions)
  Consonant
    Perfect
      Unison, Fifth (plus octave versions)
    Imperfect
      Third, Sixth (plus octave versions)
      
Motion
  Parallel
    Ascend or descend in same direction by step / skip
  Contrary  
    Ascend or descend in opposite dircetion by step / skip
  Oblique
    One voice stationary, one voice ascends/descends by step / skip
```

## The Four Fundamental Rules

These all actually boil down to 1 simple rule: You cannot arrive at a perfect consonance via parallel motion. However, the book specifies which movements are allowed verbosely, like so: 

```  
  Perfect to Perfect (fifth to octave)
    oblique, contrary 
  Imperfect to Perfect (six to fifth)
    oblique, contrary
  Perfect to Imperfect (fifth to six)
    oblique, contrary, parallel 
  Imperfect to Imperfect (six to third)
    oblique, contrary, parallel
```    

## First Species 

Note against note (lets use whole notes in examples)

```
  MUST only contain consonances
  
  MUST start and end with perfect consonances 
  MUST NOT be unison elsewhere in the piece except start and end
  MUST establish mode clearly at start (this can be translated to "we start on the tonic and should reinforce the tonic")
  SHOULD maximize imperfect consonances, they are richer
  
  MUST NOT travel by a tritone
  MUST NOT travel by a major sixth
  MAY travel above or below the cantus firmus (treat the cf as a upper/lower voice) when other options are thin
  
  SHOULD NOT "battuta" — contract from 10th to an octave stepwise
  SHOULD NOT leap to an octave consonance from a more "remote" consonance (except with many voices, the bass can do this)
  SHOULD NOT travel stepwise for a total of a tritone (ok if the voice goes beyond the tritone, this requires looking behind 4 notes...)
```

## Second Species

Two half notes against a whole note cantus firmus

```
  Thesis (downbeat) MUST only contain consonances 
  Arsis (upbeat) MAY be dissonant, only if a part of stepwise motion
```