// STUDENT'S CODE STARTS
function take_IK_step() {
	let dofCount = dof_list.length;
	let g = math.zeros([q.length]);

	for (let pt of IK_points) {
		let trObj = pt.tr;
		let worldTransform = trObj.global_transform();
		let localPoint = pt.local_pos;
		let worldPoint = math.multiply(worldTransform, localPoint);
		
		let px = worldPoint[0];
		let py = worldPoint[1];
		let targetX = pt.target_pos[0];
		let targetY = pt.target_pos[1];
		
		let offsetx = px - targetX;
		let offsety = py - targetY;
		let J = compute_jacobian(pt);	
	
		for (let iter = 0; iter < dofCount; iter++) {
			let dcdx = J[0][iter];
			let dcdy = J[1][iter];
			let contribX = dcdx * offsetx;
			let contribY = dcdy * offsety;
			let combinedGrad = contribX + contribY;
			let scaledGrad = 2 * combinedGrad;
			g[iter] = g[iter] + scaledGrad;	
		}
	}

  return g;
}

function compute_jacobian(body_point) {
	let dofCount = dof_list.length;
	let J = math.zeros([2, dofCount]);

	let tr = body_point.tr;
	let p0 = body_point.local_pos;   


	let chain = [];
	let node = tr;
	while (node !== null) {
		chain.unshift(node);
		node = node.parent;
	}
	

	for (let i = 0; i < dofCount; i++) {
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
