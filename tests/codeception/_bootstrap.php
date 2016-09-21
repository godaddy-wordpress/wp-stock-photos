<?php

// Workaround to boot individual bootstrap
$args = WP_CLI::get_runner()->arguments;

if ( isset( $args[2] ) ) {

	$file = sprintf(
		'%s/%s/_bootstrap.php',
		self::$config['paths']['tests'],
		trim( $args[2] )
	);

	if ( file_exists( $file ) ) {

		require $file;

	}

}

if ( ! isset( $args[2] ) ) {

	require self::$config['paths']['tests'] . '/acceptance/_bootstrap.php';

}
