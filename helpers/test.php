<?php

function createUser() {
    $base_api = "https://api.weeblycloud.com/";
    $api_key = "6guugiwqell17r926t4zhsp0bsnioub9";
    $api_secret = "hrc94t3pv8iiz15onm13v68206elzw65l41n6gid5jk4jeji9dlnua7x9dvsyanf";


    $request_type = "GET";
    $url = "account";
    $data = array(
        
    );

    $content = json_encode($data);

    $hash = hash_hmac('SHA256', $request_type . "\n" . $url . "\n" . $content, $api_secret);
    $hash = base64_encode($hash);

    var_dump($request_type . "\n" . $url . "\n" . $content);
    var_dump($hash);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $base_api.$url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $request_type);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $content);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-type: application/json',
        'X-Public-Key: ' . $api_key,
        'X-Signed-Request-Hash: ' . $hash
    ));

    $out = curl_exec($ch);
    $info = curl_getinfo($ch);
    curl_close($ch);

    $result = json_decode($out);
    if ($info['http_code'] === 200) {
        print_r($result);
    } else {
        print_r($result);
    }
}

createUser();
