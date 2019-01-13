var mouseDown = 0;
var mouseX = [0, 0, 0, 0];
var mouseY = [0, 0, 0, 0];
var mouseXDown = [0, 0, 0, 0];
var mouseYDown = [0, 0, 0, 0];
var wheelXEvent = 0;
var wheelYEvent = 0;
var wheelXEventPrev = 0;
var wheelYEventPrev = 0;
var wheelX = 0;
var wheelY = 0;

var lastTime = new Date().getTime();
var currentlyPressedKeys = { };
var firstTime = lastTime;
allUniforms = [];

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor( new THREE.Color(0.1, 0.1, 0.1), 1 );
document.body.appendChild( renderer.domElement );

mouseElement = renderer.domElement;

function doTouch(event) {
	mouseDown = event.touches.length;
	for (var i = 0; i < mouseDown && i < mouseX.length; i++)
	{
		mouseX[i] = event.touches[i].clientX;
		mouseY[i] = event.touches[i].clientY;
	}

    event.preventDefault();
}

mouseElement.onmousedown = function(event) { 
	if (document.activeElement == document.body)
	{
		if (mouseDown < 4)
		{
			mouseX[mouseDown] = event.clientX;
			mouseY[mouseDown] = event.clientY;

			mouseXDown[mouseDown] = event.clientX;
			mouseYDown[mouseDown] = event.clientY;
		}
		mouseDown++;
	}
}

mouseElement.onmousemove = function(event) { 
	mouseX[mouseDown - 1] = event.clientX;
	mouseY[mouseDown - 1] = event.clientY;
}

mouseElement.onmouseup = function(event) {
  mouseDown = 0;
}

mouseElement.ontouchstart = function(event) {
	mouseDown = event.touches.length;
	for (var i = 0; i < mouseDown && i < mouseX.length; i++)
	{
		mouseX[i] = event.touches[i].clientX;
		mouseY[i] = event.touches[i].clientY;

		if (i == mouseDown - 1)
		{
			mouseXDown[i] = event.touches[i].clientX;
			mouseYDown[i] = event.touches[i].clientY;
		}
	}
    event.preventDefault();
}

mouseElement.onwheel = function(event)
{
	wheelXEvent += event.deltaX;
	wheelYEvent += event.deltaY;
    event.preventDefault();
}

mouseElement.ontouchmove = doTouch;
mouseElement.ontouchend = doTouch;
mouseElement.ontouchcancel = doTouch;


var fov = 28 * (1 + window.innerHeight / window.innerWidth);
if (fov < 45)
	fov = 45;

var camera = new THREE.PerspectiveCamera( fov, window.innerWidth / window.innerHeight, 1, 45000 );
camera.position.set( 200, 200, 200 );
camera.lookAt( 0, 0, 0 );
camera.far = 100000;

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
	console.log(camera);

	var fov = 28 * (1 + window.innerHeight / window.innerWidth);
	if (fov < 45)
		fov = 45;

	camera.fov = fov;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}


var fires = [];
var selectedFire = 0;

var upperLeftXZ = [-36.47633460736296, -15.643802927037866];
var upperLeftLon = [37.7749, -122.4194];

var lowerRightXZ = [77.17454141600969, 75.14145647495577];
var lowerRightLon = [33.105429, -114.700336];


var stageCounter = 0;
var stageTimer = -1000;
var stages = [];
addStage([0, 0], 300, "");
addStage([-23.992712983042917, -54.35661394300741], 10, "");

function addStage(pos, h, text)
{
	var stage = {};
	stage.pos = pos;
	stage.h = h;
	stage.text = text;
	stages.push(stage);
}


addFire([-23.992712983042917, -54.35661394300741], "Camp Fire")
function addFire(pos, name)
{
	var fire = { };
	fire.pos = pos;
	fire.name = name;
	fire.points = [];
	fires.push(fire);
}

options = {
	position: new THREE.Vector3(),
	positionRandomness: 0.5,
	velocity: new THREE.Vector3(0, 0.0001, 0),
	velocityRandomness: 0,
	color: 0xffffff,
	colorRandomness: 0.3,
	turbulence: .00,
	lifetime: 100,
	size: 2,
	sizeRandomness: 1,
};


var loader = new THREE.TextureLoader();
var cali = loader.load( "tex/cali.png" );
var blurred = loader.load( "tex/blurred.jpg" );
var noise = loader.load( "tex/noise.jpg" );
// var smokeLayer = loader.load( "tex/smokelayer.png" );

noise.wrapS = THREE.RepeatWrapping;
noise.wrapT = THREE.RepeatWrapping;


uniforms = {
	globalTime:	{ type: "f", value: 0.0 },
	texture:    { type: "t", value: noise },
};
allUniforms.push(uniforms);


var fireMat = new THREE.ShaderMaterial( {
	uniforms: 		uniforms,
	vertexShader:   document.getElementById( 'firevert' ).textContent,
	fragmentShader: document.getElementById( 'firefrag' ).textContent,
	wireframe: 		false,
	side: 			THREE.DoubleSide,
});
fireMat.blending = THREE.AdditiveBlending;
fireMat.transparent = true;
fireMat.depthWrite = false;

var deadZones = [];

function addCoords(mesh, geometry, coords, lastCoord) {

	mesh.position.y = 5;
	mesh.position.x = (coords[0] + lastCoord[0]) / 2;
	mesh.position.z = (coords[1] + lastCoord[1]) / 2;

	mesh.rotation.y = Math.atan2(coords[0] - lastCoord[0], coords[1] - lastCoord[1]) + Math.PI / 2;
	mesh.scale.x = Math.sqrt((coords[0] - lastCoord[0]) * (coords[0] - lastCoord[0]) + (coords[1] - lastCoord[1]) * (coords[1] - lastCoord[1]));
	if (mesh.scale.x > 0)
		THREE.GeometryUtils.merge(geometry, mesh);
}


function parseLines(lines, fireCount) {

	var planeGeometry = new THREE.PlaneGeometry(1, 4, 1, 1);
	var mesh = new THREE.Mesh(planeGeometry);
	var geometry = new THREE.Geometry();

	var i = 0;
	var first = true;
	var lastCoord;
	var firstCoord;

	var avg = [0, 0];
	var count = 0;

	for (var i = 0; i < lines.length; i += 20)
	{
		var s = lines[i].trim();
		if (s.length > 0)
		{
			var lonLatCoords = s.split(',');
			if (lonLatCoords.length > 2)
				lonLatCoords.pop();
			lonLatCoords.reverse();

			var coords = lonLatToXZ(lonLatCoords);

			if (!first)
			{
				addCoords(mesh, geometry, coords, lastCoord);
			}
			else
				firstCoord = coords;

			first = false;
			lastCoord = coords;

			avg[0] += coords[0];
			avg[1] += coords[1];

			if (fireCount != -1)
				fires[fireCount].points.push(coords);

			count++;
		}
	}

	avg[0] /= count;
	avg[1] /= count;

	deadZones.push(avg);

	if (lastCoord && firstCoord)
		addCoords(mesh, geometry, lastCoord, firstCoord);

	var fire = new THREE.Mesh(geometry, fireMat);
	scene.add( fire );
}

function parsePolyParent(node, fireCount)
{
	for (var i = 0; i < node.childNodes.length; i++)
	{
		if (node.childNodes[i].nodeName == "MultiGeometry")
		{
			parsePolyParent(node.childNodes[i], fireCount);
		}
		else if (node.childNodes[i].nodeName == "Polygon")
		{
			var text = node.childNodes[i].childNodes[1].childNodes[1].getElementsByTagName("coordinates")[0].textContent;

			var lines = text.split('\n');
			parseLines(lines, fireCount);
		}
	}
}

function parseFireNode(node)
{
	var nodeName = node.getElementsByTagName("name")[0].textContent.toLowerCase();
	// if (nodeName.includes("perimeter"))
	{
		var fireCount = -1;
		for (var i  = 0; i < fires.length; i++)
			if (nodeName.includes(fires[i].name.toLowerCase()))
			{
				fireCount = i;
				break;
			}
		parsePolyParent(node, fireCount);
	}
}

function parseDoc(doc) {
	for (var i = 0; i < doc.childNodes.length; i++)
	{
		if (doc.childNodes[i].nodeName == "Placemark")
		{
			parseFireNode(doc.childNodes[i]);
		}
	}
}

loadKML();
function loadKML() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
  	if (this.readyState == 4)
  	{
	    if (this.status == 200) {
	    	var xmlDoc = new DOMParser().parseFromString(this.responseText,'text/xml');

	    	console.log(xmlDoc);
	    	var x = xmlDoc.documentElement.childNodes;
	    	for (i = 0; i < x.length ;i++) {
	    		if (x[i].nodeName == "Document")
	    		{
	    			parseDoc(x[i]);
	    		}
	    	}
	    }
	    else
	    {
	    	console.log("Load Fail");
	    	loadKML();
	    }
	}
  };
  xhttp.open("GET", "tex/doc.kml", true);
  xhttp.send();
}


var scene = new THREE.Scene();
scene.add(new THREE.AmbientLight( 0x555555 ));

{
	var light = new THREE.PointLight( 0xcccccc, 2, 3000 );
	light.position.set( -600, 600, 600 );
	scene.add( light );
}
cloudParticleSystem = new THREE.GPUParticleSystem( {
	maxParticles: 250000,
	particleSpriteTex: loader.load("tex/part1.png")
}, true );
scene.add( cloudParticleSystem );

darkParticleSystem = new THREE.GPUParticleSystem( {
	maxParticles: 250000,
	particleSpriteTex: loader.load("tex/smoke.png")
}, false );
scene.add( darkParticleSystem );



var caliUniforms;
{
	caliUniforms = {
		texture:    { type: "t", value: cali },
		texture2:    { type: "t", value: noise },
		dispTex:    { type: "t", value: blurred },
		deadZone: 	{ type: "v2", value: new THREE.Vector2(0, 0) },
		globalTime:	{ type: "f", value: 0.0 },
		globalDark:	{ type: "f", value: 1.0 },
		// smoke:    { type: "t", value: smokeLayer },
	};
	allUniforms.push(caliUniforms);

	var mat = new THREE.ShaderMaterial( {
		uniforms: 		caliUniforms,
		vertexShader:   document.getElementById( 'vert' ).textContent,
		fragmentShader: document.getElementById( 'frag' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});

	var geometry = new THREE.PlaneGeometry(174.2, 194.3, 300, 300);
	var body = new THREE.Mesh( geometry, mat );
	body.rotation.x = -Math.PI / 2;
	scene.add(body);
}

var smokeUniforms;
{
	smokeUniforms = {
		// texture:    { type: "t", value: smokeLayer },
		globalTime:	{ type: "f", value: 0.0 },
		alpha:	    { type: "f", value: 0.0 },

	};
	allUniforms.push(smokeUniforms);


	var smokeMat = new THREE.ShaderMaterial( {
		uniforms: 		smokeUniforms,
		vertexShader:   document.getElementById( 'smokevert' ).textContent,
		fragmentShader: document.getElementById( 'smokefrag' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});

	smokeMat.transparent = true;
	smokeMat.depthWrite = false;
	smokeMat.depthRead = false;

	var geometry = new THREE.PlaneGeometry(174.2, 194.3, 1, 1);
	var body = new THREE.Mesh( geometry, smokeMat );
	body.rotation.x = -Math.PI / 2;
	body.position.y = 15;
	// scene.add(body);
}


var camPoint;
{
	var mat = new THREE.MeshBasicMaterial( {
		wireframe: 		false,
	});

	var geometry = new THREE.CylinderBufferGeometry(0.25, 0.5, 7, 10);
	camPoint = new THREE.Mesh( geometry, mat );
	// scene.add(camPoint);
}

function lonLatToXZ(pos)
{
	var out = [0, 0];
	for (var i = 0; i < 2; i++)
		out[i] = (pos[1 - i] - upperLeftLon[1 - i]) / (upperLeftLon[1 - i] - lowerRightLon[1 - i]) * (upperLeftXZ[i] - lowerRightXZ[i]) + upperLeftXZ[i];

	return out;
}

var cities = [];

addCity([37.7749, -122.4194], "San Fransisco");
addCity([38.5816, -121.4944], "Sacramento");

// addCity([-20.686450209034252, -27.12022950595679], "Sacramento");
function addCity(pos, name)
{
	var iDiv = document.createElement('div');
	iDiv.className = 'fixed';
	iDiv.innerHTML = "<div class=\"dot\"></div>" + name;

	var city = {}
	city.pos = lonLatToXZ(pos);
	city.div = iDiv;
	cities.push(city);

	document.getElementsByTagName('body')[0].appendChild(iDiv);
}

var firePos =  [-20.424774882341836, -45.309763687666];
makeFire(firePos[0], 5, firePos[1])
function makeFire(x, y, z)
{


}


var targetCamHeight = 200;
var targetCamRot = Math.PI * 0.5;
var camHeight = 200;
var camRot = targetCamRot;
var dist = 100;

camX = 0;
camZ = 0;

function moveCamBy(rot)
{
	var mult = 0.5;
	camX -= Math.cos(rot) * mult;
	camZ -= Math.sin(rot) * mult;
}

function animate() {

	wheelX = wheelXEvent - wheelXEventPrev;
	wheelXEventPrev = wheelXEvent;
	wheelY = wheelYEvent - wheelYEventPrev;
	wheelYEventPrev = wheelYEvent;

	var mouseDx = mouseXDown[0] - mouseX[0];
	mouseXDown[0] = mouseX[0];
	var mouseDy = mouseYDown[0] - mouseY[0];
	mouseYDown[0] = mouseY[0];

	mouseDx += wheelX * 0.25;
	mouseDy += wheelY * 0.25;

	var timeNow = new Date().getTime();
	var deltaTime = timeNow - lastTime;
	if (deltaTime > 60)
		deltaTime = 60;


	stageTimer += deltaTime;
	var stage = stages[stageCounter];
	var targetCamX = stage.pos[0];
	var targetCamZ = stage.pos[1];

	camX += (targetCamX - camX) * 0.01;
	camZ += (targetCamZ - camZ) * 0.01;

	if (stageTimer > 2000)
	{
		stageTimer = 0;
		if (stageCounter < stages.length - 1)
			stageCounter++;
	}


	var viewport = new THREE.Vector4();
	viewport.copy( renderer.getCurrentViewport() );

	requestAnimationFrame( animate );

	var rot = camRot;

	var mult = 1;

	if (window.innerHeight >  window.innerWidth)
		mult = 0.5 + (window.innerHeight / window.innerWidth * 0.5);
	camera.position.set( camX + dist * Math.cos(rot) * mult, camHeight * mult, camZ + dist * Math.sin(rot) * mult);
	camPoint.position.set(camX, 2, camZ);

	for (var i = 0; i < cities.length; i++)
	{
		var div = cities[i].div;
		var positionScreen = new THREE.Vector3(cities[i].pos[0], 4, cities[i].pos[1]);
		positionScreen.applyMatrix4( camera.matrixWorldInverse );
		positionScreen.applyMatrix4( camera.projectionMatrix );


		var halfViewportWidth = viewport.z / 2.0;
		var halfViewportHeight = viewport.w / 2.0;

		var left = viewport.x + ( positionScreen.x * halfViewportWidth ) + halfViewportWidth - div.offsetWidth / 2;
		var bottom = viewport.y + ( positionScreen.y * halfViewportHeight ) + halfViewportHeight - div.offsetHeight / 2;

		//if (left < 0 || left > window.innerWidth - 100 || bottom < 100 || bottom > window.innerHeight)
		//	div.style.display = "none";
		//else
		{
			div.style.left = left;
			div.style.bottom = bottom;
			//div.style.display = "block";
		}
		
	}

	camera.lookAt( camX, 4, camZ );	
	for (var i = 0; i < allUniforms.length; i++)
	{
		var uniforms = allUniforms[i];
		uniforms.globalTime.value += deltaTime * 0.0012;
	}

	var fire = fires[selectedFire];
	caliUniforms.deadZone.value.x = fire.pos[0] * 1;
	caliUniforms.deadZone.value.y = -fire.pos[1] * 1;

	if (fire.points && fire.points.length > 0)
	{
		if (Math.random() > 0.75)
		{
			var firePoint = fire.points[parseInt(fire.points.length * Math.random())];
			var lerp = Math.random();
			var fireX = fire.pos[0] + (firePoint[0] - fire.pos[0]) * lerp;
			var fireZ = fire.pos[1] + (firePoint[1] - fire.pos[1]) * lerp;

			options.position.x = fireX;
			options.position.y = 5;
			options.position.z = fireZ;
			options.size = 2 + 4 * Math.random();
			options.lifetime = 5000 + 15000 * Math.random();
			options.color = 0xf4c141;
			options.velocity.x = -0.00005 * Math.random();
			options.velocity.y = 0.00005;
			options.velocity.z = -0.000;
			options.velocityRandomness = 0.00005;
			options.turbulence = 0.00005;

			cloudParticleSystem.spawnParticle( options );

		}
		if (Math.random() > 0.9 && camHeight < 25)
		{
			options.position.y = 2 + 3 * Math.random();
			options.velocity.x = -0.000;
			options.velocity.y = 0.000;
			options.velocity.z = -0.000;
			options.lifetime = 20000;
			options.size = (12 + 40 * Math.random());
			options.velocityRandomness = 0.0000;
			options.turbulence = 0.0000;
			cloudParticleSystem.spawnParticle( options );
		}

		if (Math.random() > 0.95)
		{
			options.position.y = 5 + 4 * Math.random();
			options.color = 0x000000;
			options.velocity.x = -0.0001 * Math.random();
			options.velocity.y = 0.0001;
			options.velocity.z = -0.000;
			options.lifetime = 20000 + 20000 * Math.random();
			options.size = (8000 + 1000 * Math.random());

			// darkParticleSystem.spawnParticle( options );
		}
	}


	targetCamHeight += mouseDy * 0.25;
	if (currentlyPressedKeys[38] || currentlyPressedKeys[87])
	{
		targetCamHeight += 0.2 * deltaTime;
	}
	if (targetCamHeight > 400)
		targetCamHeight = 400;

	if (currentlyPressedKeys[40] || currentlyPressedKeys[83])
	{
		targetCamHeight -= 0.2 * deltaTime;
	}
	if (targetCamHeight < 10)
		targetCamHeight = 10;

	targetCamRot += mouseDx * 0.002;
	if (currentlyPressedKeys[39] || currentlyPressedKeys[68])
	{
		targetCamRot -= 0.003 * deltaTime;
	}
	if (currentlyPressedKeys[37] || currentlyPressedKeys[65])
	{
		targetCamRot += 0.003 * deltaTime;
	}

	dist += (10 - dist) * 0.01;

	if (camHeight < 50)
		targetCamRot += 0.0002 * deltaTime * (50 - camHeight) / 50;

	targetCamHeight += (stage.h - targetCamHeight) * 0.015;
	camHeight += (targetCamHeight - camHeight) * 0.2;
	camRot += (targetCamRot - camRot) * 0.1;

	if (camHeight < 50)
		caliUniforms.globalDark.value = (camHeight / 50) * 0.4 + 0.6;
	else
		caliUniforms.globalDark.value = 1.0;

	{
		var targetAlpha = (camHeight - 50) / 50;
		if (targetAlpha > 1)
			targetAlpha = 1;

		smokeUniforms.alpha.value = targetAlpha;
	}

	cloudParticleSystem.update( timeNow - firstTime );
	darkParticleSystem.update( timeNow - firstTime );

	renderer.render( scene, camera );
	lastTime = timeNow;

	if (window.innerWidth != renderer.getSize().width || window.innerWidth != renderer.getSize().width)
		onWindowResize();
};

animate();


function handleKeyDown(event) {
	currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
	currentlyPressedKeys[event.keyCode] = false;
}

document.addEventListener( 'keydown', handleKeyDown, false );
document.addEventListener( 'keyup', handleKeyUp, false );

