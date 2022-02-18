
glMatrix.setMatrixArrayType(Array);

var prng = new Math.seedrandom("so many colorful shapes");
function rand(min, max) {
    return (max - min) * prng() + min;
}

const canvasDim = [600, 800];

let alpha = -60.0;
let beta  = 4.0;
let gamma = 0.0;

const bg = vec3.fromValues(250, 247, 242);

function projectionMatrix() {
    let projection = mat4.create();
    mat4.perspective(projection, glMatrix.toRadian(70.0), canvasDim[0] / canvasDim[1], 0.1);
    return projection;
}

function viewMatrix() {
    const eye     = vec3.fromValues(0.0, Math.sqrt(Math.max(0.1, beta)), 5.0);
    const center  = vec3.fromValues(0.0, 0.0, 0.0);
    const up      = vec3.fromValues(0.0, 1.0, 0.0);
    let view      = mat4.create();
    mat4.lookAt(view, eye, center, up);
    return view;
}

function screenProjection(projection, view, model, points) {
    let mvp = mat4.create();
    mat4.mul(mvp, view, model);
    mat4.mul(mvp, projection, mvp);

    const canvasCoords = points.map(function(v) {
        let p = vec3.create();
        vec3.transformMat4(p, v, mvp);
        p[0] = 0.5 * canvasDim[0] * (1 + p[0]);
        p[1] = 0.5 * canvasDim[1] * (1 - p[1]);
        return p;
    });
    return canvasCoords;
}

function drawLineStrip(points) {
    beginShape(LINES);

    const p_first = points[0];
    vertex(p_first[0], p_first[1]);

    for(let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        vertex(p[0], p[1]);
        vertex(p[0], p[1]);
    }

    const p_last = points[points.length - 1];
    vertex(p_last[0], p_last[1]);

    endShape();
}

function setup() {
    createCanvas(canvasDim[0], canvasDim[1]);
    strokeWeight(1);
}

const square = [
    vec3.fromValues(-1, 0, -1),
    vec3.fromValues(1, 0, -1),
    vec3.fromValues(1, 0, 1),
    vec3.fromValues(-1, 0, 1)
];
const twig = [
    vec3.fromValues(0, 0.5, 0),
    vec3.fromValues(-0.1, 1, 0.1),
    vec3.fromValues(0.1, 1.5, -0.1)
];

function draw() {
    background(bg[0], bg[1], bg[2]);

    const projection = projectionMatrix();
    const view = viewMatrix();
    let model = mat4.create();
    mat4.fromYRotation(model, glMatrix.toRadian(alpha));

    p_square = screenProjection(projection, view, model, square);
    strokeWeight(1);
    fill(255);
    stroke(0);
    beginShape();
    p_square.forEach(p => {
        vertex(p[0], p[1]);
    });
    endShape(CLOSE);

    const light = vec4.fromValues(0.5 + Math.cos(glMatrix.toRadian(gamma)), 2, Math.sin(glMatrix.toRadian(gamma)), 1);
    const plane = vec4.fromValues(0, 1, 0, 0);
    const plane_dot_light = vec4.dot(plane, light);
    const shadowProjection = mat4.fromValues(
        light[0] * plane[0] - plane_dot_light, light[1] * plane[0], light[2] * plane[0], light[3] * plane[0],
        light[0] * plane[1], light[1] * plane[1] - plane_dot_light, light[2] * plane[1], light[3] * plane[1],
        light[0] * plane[2], light[1] * plane[2], light[2] * plane[2] - plane_dot_light, light[3] * plane[2],
        light[0] * plane[3], light[1] * plane[3], light[2] * plane[3], light[3] * plane[3] - plane_dot_light
    );

    p_light = screenProjection(projection, view, model, [light]);
    p_twig = screenProjection(projection, view, model, twig);
    mat4.mul(model, model, shadowProjection);
    p_shadow = screenProjection(projection, view, model, twig);

    strokeWeight(3);
    noFill();
    stroke(120);
    drawLineStrip(p_shadow);
    stroke(0);
    drawLineStrip(p_twig);

    strokeWeight(10);
    stroke(255, 0, 0);
    point(p_light[0][0], p_light[0][1]);

    gamma += 0.7;
}

function mouseDragged(event) {
    const sensitivity = 0.2;
    alpha += sensitivity * event.movementX;
    beta  += sensitivity * event.movementY;
    // console.log("alpha = " + alpha + " deg, beta = " + beta + " deg");
}
