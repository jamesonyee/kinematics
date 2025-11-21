// STUDENT'S CODE STARTS

function take_IK_step() {
  // return the gradient of the IK residual, a 1d array of length ndofs
	// TODO: STUDENT'S CODE STARTS
	// Please copy your code from P1
	let ndofs = dof_list.length;
	let g = math.zeros([q.length]);

	
	for (let p0 of IK_points) {
		let M = p0.tr.global_transform();
		let p = math.multiply(M, p0.local_pos);   
	
		let cx = p[0] - p0.target_pos[0];
		let cy = p[1] - p0.target_pos[1];
	
	
		let J = compute_jacobian(p0);
	
	
		for (let i = 0; i < ndofs; i++) {
			let dcdx = J[0][i];
			let dcdy = J[1][i];
			g[i] += 2 * (dcdx * cx + dcdy * cy);
		}
	}
 
	// STUDENT'S CODE ENDS
	
  return g;
}

function compute_jacobian(body_point) {
  // return the Jacobian matrix, a 2xN matrix
	let ndofs = dof_list.length;
	let J = math.zeros([2, ndofs]);

	let tr = body_point.tr;
	let p0 = body_point.local_pos;   


	let chain = [];
	let node = tr;
	while (node !== null) {
		chain.unshift(node);
		node = node.parent;
	}
	

	for (let i = 0; i < ndofs; i++) {
		let joint = dof_list[i];

		
		if (!tr.dependent_dofs.has(joint)) continue;

		
		let jIndex = chain.indexOf(joint);
		if (jIndex < 0) continue;

		
		let T_left = math.identity([3]);
		for (let k = 0; k < jIndex; k++) {
			T_left = math.multiply(T_left, chain[k].local_transform());
		}

		
		let dT = joint.local_derivative();

		
		let T_right = math.identity([3]);
		for (let k = jIndex + 1; k < chain.length; k++) {
			T_right = math.multiply(T_right, chain[k].local_transform());
		}

		
		let dT_global = math.multiply(math.multiply(T_left, dT), T_right);
		
	
		let dpos = math.multiply(dT_global, p0);

		J[0][i] = dpos[0]; 
		J[1][i] = dpos[1];
  } 
	
  return J;
}
// STUDENT'S CODE ENDS
