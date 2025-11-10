// STUDENT'S CODE STARTS

function take_IK_step() {
  // return the gradient of the IK residual, a 1d array of length ndofs
	
	// TODO: STUDENT'S CODE STARTS
	// Please copy your code from P1
  let g = math.zeros([q.length]);
 
	// STUDENT'S CODE ENDS
	
  return g;
}

function compute_jacobian(body_point) {
  // return the Jacobian matrix, a 2xN matrix
  let ndofs = dof_list.length;
  let J = math.zeros([2, ndofs]);

	// TODO: STUDENT'S CODE STARTS
	// Please copy your code from P1
 
	// STUDENT'S CODE ENDS
	
  return J;
}
// STUDENT'S CODE ENDS
