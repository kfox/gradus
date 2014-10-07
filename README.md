## Hyper-gradus!

See the [Roadmap](ROADMAP.md) and the [GHETTO_RFC](GHETTO_RFC.md)

## How to run

```
gem install serve
serve .
```
and then hit localhost:4000 in the browser

## How to run tests

1) Install [node](http://nodejs.org)

2) Install testem for prettiness 

```
npm install mocha 
npm install should
npm install chai
npm install testem -g
```

3) Run tests from the test dir

```
cd tests
testem
```

This will launch chrome and display results in terminal.