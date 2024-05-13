<p align=center>
  <a target="_blank" href="http://paintle.strongleong.ru">
    <img src="./img/logo.png">
  </a>
</p>
<h1 align="center">Paintlie</h1>

[![.github/workflows/main.yml](https://github.com/Strongleong/Paintle/actions/workflows/main.yml/badge.svg)](https://github.com/Strongleong/Paintle/actions/workflows/main.yml)

This tool allowes you to paint how your worlde solution you want to look.

![Paintlie screenshot](./img/paintle.png)

## Local devlopment

### Via Docker

```console
docker-compose up -d
```

Local instance of Paintle will be accessible at `paintle.localtest.me`

### Via PHP

```console
cd src
php -S 127.0.0.1:8080
```

## TODO

 - [X] Searching for correct words to input into wordle
 - [X] Language selection (some regions of the world have their own wordle)
 - [X] Uploading your own wordle dictionary
 - [X] Night/day scheme switching
 - [X] Colorblind mode color scheme
 - [X] Some animations
 - [X] Board reset
 - [X] Localisation
 - [ ] Better explanation of project
