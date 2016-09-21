<?php

global $sp_post_id;

// Apply filters for browserstack credentials since we don't want to version it
self::$config['modules'] = [
	'config' => [
		'WebDriver' => [
			'url'     => apply_filters( 'webdriver_url', home_url() ),
			'browser' => apply_filters( 'webdriver_browser', 'firefox' ),
		],
		'BrowserStack' => [
			'url'        => apply_filters( 'browserstack_url', home_url() ),
			'username'   => apply_filters( 'browserstack_username', '' ),
			'access_key' => apply_filters( 'browserstack_accesskey', '' ),
		],
	],
];

// Insert one post to play with
$sp_post_id = wp_insert_post( [
	'post_title'   => 'Stock Photos Test',
	'post_content' => '',
] );

add_action( 'shutdown', function() use( $sp_post_id ) {

	wp_delete_post( $sp_post_id );

} );
