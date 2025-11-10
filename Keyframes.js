class Keyframes {
	constructor() {
    this.keys = [];
		let pose1 = [...q]
		let pose2 = [...q]
		this.keys.push([0, pose1]);
		this.keys.push([NUM_OF_FRAMES - 1, pose2]);
		this.interpolated_frames = [];
		for (let i = 0; i < NUM_OF_FRAMES; i++) {
			let pose = math.zeros([dof_list.length]);
			this.interpolated_frames.push(pose);
		}
  }

	add_keyframe(time, pose) {
		for (let i = 0; i < this.keys.length; i++) {
			if (this.keys[i][0] >= time) {
				if (this.keys[i][0] == time)
					this.keys.splice(i, 1);
				this.keys.splice(i, 0, [time, pose]);
				break;
			}
		}
	}
	
	linear_interpolation() {
		this.interpolated_frames = [];
		for (let i = 0; i < this.keys.length - 1; i++) {
			let first_key = this.keys[i];
			let second_key = this.keys[i + 1];
			let duration = second_key[0] - first_key[0];
			let pose_diff = math.subtract(second_key[1], first_key[1]);
			let curr_frame = first_key[0];
			while (curr_frame <= second_key[0]) {
				let curr_pose = math.add(first_key[1], math.multiply(pose_diff, (curr_frame - first_key[0]) / duration));
				this.interpolated_frames.push(curr_pose);
				curr_frame++;
			}
		}
	}
	
	catmull_rom_interpolation() {
    // TODO: STUDENT'S CODE STARTS
		
		// STUDENT'S CODE ENDS
	}
	
	bspline_interpolation() {
		// TODO: STUDENT'S CODE STARTS
		
		// STUDENT'S CODE ENDS
	}
	
	draw_trajectory() {
		if (animating_joint_id >= 0) {
			for(let i = 0; i < NUM_OF_FRAMES; i++){
				push();
				stroke(GREEN);
				strokeWeight(0.01);
				fill(GREEN);
				let x = timeline_origin[0] + timeline_width * i / NUM_OF_FRAMES;
				let y = timeline_origin[1] + this.interpolated_frames[i][animating_joint_id] * 0.1;
				point(x, y);
				pop();	
			}
		}
		
		for (let i = 0; i < this.keys.length; i++) {
			push();
			stroke(ORANGE);
			if (this.keys[i][0] == current_frame)
				strokeWeight(0.03);
			else
				strokeWeight(0.01);
			let p1 = [timeline_origin[0] + timeline_width * this.keys[i][0] / NUM_OF_FRAMES, timeline_origin[1] + timeline_height * 0.5];
			let p2 = [timeline_origin[0] + timeline_width * this.keys[i][0] / NUM_OF_FRAMES, timeline_origin[1] - timeline_height * 0.5];
			line(p1[0], p1[1], p2[0], p2[1]);
			pop();
		}
	}
}
