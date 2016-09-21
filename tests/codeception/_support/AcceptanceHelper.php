<?php
namespace Codeception\Module;

// here you can define custom actions
// all public methods declared in helper class will be available in $I

class AcceptanceHelper extends \Codeception\Module {

	/**
	 * Wait in ms
	 *
	 * @param int $ms
	 */
	public function msWait( $ms ) {

		usleep( $ms * 1000 );

	}

}
