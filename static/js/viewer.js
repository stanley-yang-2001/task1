window.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("renderCanvas");

  // Create Babylon engine and scene
  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);

  // Add camera
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 2.5,
    5,
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  camera.attachControl(canvas, true);

  // Add light
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.8;

  // Load GLB model
  BABYLON.SceneLoader.Append(
    "/static/assets/3d/",
    "laser_optimized.glb",
    scene,
    function (scene) {
      scene.createDefaultCameraOrLight(true, true, true);
      scene.activeCamera.alpha += Math.PI; // face the camera to the front
    },
    null,
    function (scene, message) {
      console.error("Failed to load model:", message);
    }
  );

  // Start rendering
  engine.runRenderLoop(() => {
    scene.render();
  });

  // Resize if window changes
  window.addEventListener("resize", () => {
    engine.resize();
  });
});
