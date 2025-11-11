// STUDENT'S CODE STARTS

function take_IK_step() {
  // return the gradient of the IK residual, a 1d array of length ndofs
	
	// TODO: STUDENT'S CODE STARTS
	// Please copy your code from P1
  let g = math.zeros([q.length]);

  // Iterate over all IK points
  IK_points.forEach((p) => {
    // Current and target position
    let cur = math.flatten(math.subset(p.tr.global_transform(), math.index([0, 1], 2)));
    let target = p.target_pos;
    let error = math.subtract(target, cur);

    // Compute Jacobian
    let J = compute_jacobian(p.tr);

    // Compute gradient step
    let step = math.multiply(math.transpose(J), error);

    g = math.add(g, step);
  });

  // Normalize and scale step
  g = math.multiply(0.5, g);

  // Apply gradient step
  for (let i = 0; i < q.length; i++) {
    q[i] += g[i];
    dof_list[i].set_dof(q[i]);
  }
 
	// STUDENT'S CODE ENDS
	
  return g;
}

function compute_jacobian(body_point) {
    // return the Jacobian matrix, a 2xN matrix
    let ndofs = dof_list.length;
    let J = math.zeros([2, ndofs]);

    p = body_point.global_position();

    for(let i = 0; i < ndofs; i++) {
        let jnt = dof_list[i];

        //Only joints taht affect this point
        if (!body_point.dependent_dofs.has(jnt)) continue;

        // Compute derivative of transformation chain
        let T_parent_to_joint = transform_between(null, jnt.parent);
        let dT = jnt.local_derivative();
        let T_joint_to_body = transform_between(jnt, body_point);

        // dp = dT * T_joint_to_body * [0,0,1]
        let dp = math.multiply(T_parent_to_joint, math.multiply(dT, math.multiply(T_joint_to_body, [0, 0, 1])));

        // Fill the Jacobian column
        J = math.subset(math.index(0, i), dp[0]);
        J = math.subset(math.index(1, i), dp[1]);
    }
	// STUDENT'S CODE ENDS
	
  return J;
}
// STUDENT'S CODE ENDS
