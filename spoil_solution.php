<?php

function getSolutionEn()
{
  // This url give smallest response.
  $urlDate = 'https://www.nytimes.com/svc/games/state/wordle/latest';
  $url = 'https://www.nytimes.com/svc/wordle/v2/%date%.json';

  $options = [
    'http' => [
      'method' => 'GET',
    ],
  ];

  $context = stream_context_create($options);
  $result = get_headers($urlDate, true, $context);

  if ($result === false) {
    /* Handle error */
  }

  $date = new DateTime($result['Date']);
  $url = str_replace('%date%', $date->format('Y-m-d'), $url);
  $result = file_get_contents($url, false, $context);

  if ($result === false) {
    /* Handle error */
  }

  return json_decode($result, true)['solution'];
}

function getSolutionRu()
{
  $url = 'https://wordle.belousov.one/api/v2/daily/?lang=ru'; // lang param is neccecery for some reason

  $options = [
    'http' => [
      'method' => 'GET',
    ],
  ];

  $context = stream_context_create($options);
  $result = file_get_contents($url, false, $context);

  if ($result === false) {
    /* Handle error */
  }

  return json_decode($result, true)['data']['word'];
}

function getSolution()
{
  $lang = $_GET['lang'] ?? 'en';

  switch ($lang) {
    case 'ru':
      return getSolutionRu();
      break;
    case 'en':
    default:
      return getSolutionEn();
  }
}

$res = [
  'solution' => getSolution(),
];

header('Content-Type: application/json');
echo json_encode($res);
