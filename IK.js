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
	let trNode = body_point.tr;
	let localPoint = body_point.local_pos;   
	let path = buildPathFromRootTo(trNode);

	for (let iter = 0; iter < dofCount; iter++) {
		let elem = dof_list[iter];
		if (!trNode.dependent_dofs.has(elem)) {
			continue;
		}
		let elemId = path.indexOf(elem);
		if (elemId < 0) {
			continue;
		}
		let preTransform = math.identity([3]);
		let postTransform = math.identity([3]);
		for (let iter = 0; iter < elemId; iter++) {
			let currentSegment = path[iter];
			let segTransform = currentSegment.local_transform();
			let updatedTransform = math.multiply(preTransform, segTransform);
			preTransform = updatedTransform;
		}

		let deriv = elem.local_derivative();
		let startIndex = elemId + 1;
		let endIndex = path.length;
		for (let iter = startIndex; iter < endIndex; iter++) {
			let segment = path[iter];
			let segT = segment.local_transform();
			postTransform = math.multiply(postTransform, segT);
		}
		let firstStep = math.multiply(preTransform, deriv);
		let secondStep = math.multiply(firstStep, postTransform);
		let thirdStep = math.multiply(secondStep, localPoint);
		let dpos = thirdStep;

		J[0][iter] = dpos[0]; 
		J[1][iter] = dpos[1];
  } 
  return J;
}

function buildPathFromRootTo(node) {
  let path = [];
  let ptr = node;
  while (ptr) {
    path.unshift(ptr);
    let parentNode = ptr.parent;
    ptr = parentNode;
  }
  return path;
}
