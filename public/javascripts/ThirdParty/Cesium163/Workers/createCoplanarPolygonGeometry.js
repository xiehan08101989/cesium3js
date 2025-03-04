/**
 * Cesium - https://github.com/AnalyticalGraphicsInc/cesium
 *
 * Copyright 2011-2017 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md for full licensing details.
 */
define(['./when-0488ac89', './Check-78ca6843', './Math-a09b4ca4', './Cartesian2-e22df635', './defineProperties-c6a70625', './Transforms-6adeead3', './RuntimeError-4d6e0952', './WebGLConstants-66e14a3b', './ComponentDatatype-9fd090e4', './GeometryAttribute-34f9090e', './GeometryAttributes-3227db5b', './AttributeCompression-3fc96685', './GeometryPipeline-11c16a80', './EncodedCartesian3-67d5d816', './IndexDatatype-0b3c1fea', './IntersectionTests-7f177a7d', './Plane-25a88d8d', './VertexFormat-f568cac2', './GeometryInstance-74302edd', './arrayRemoveDuplicates-aa017891', './BoundingRectangle-0876e4b1', './EllipsoidTangentPlane-72fadcdc', './OrientedBoundingBox-3264763c', './CoplanarPolygonGeometryLibrary-95b8635a', './ArcType-318ba758', './EllipsoidRhumbLine-5aa5f0b7', './PolygonPipeline-298d5a15', './PolygonGeometryLibrary-7cb38196'], function (when, Check, _Math, Cartesian2, defineProperties, Transforms, RuntimeError, WebGLConstants, ComponentDatatype, GeometryAttribute, GeometryAttributes, AttributeCompression, GeometryPipeline, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, VertexFormat, GeometryInstance, arrayRemoveDuplicates, BoundingRectangle, EllipsoidTangentPlane, OrientedBoundingBox, CoplanarPolygonGeometryLibrary, ArcType, EllipsoidRhumbLine, PolygonPipeline, PolygonGeometryLibrary) { 'use strict';

    var scratchPosition = new Cartesian2.Cartesian3();
        var scratchBR = new BoundingRectangle.BoundingRectangle();
        var stScratch = new Cartesian2.Cartesian2();
        var textureCoordinatesOrigin = new Cartesian2.Cartesian2();
        var scratchNormal = new Cartesian2.Cartesian3();
        var scratchTangent = new Cartesian2.Cartesian3();
        var scratchBitangent = new Cartesian2.Cartesian3();
        var centerScratch = new Cartesian2.Cartesian3();
        var axis1Scratch = new Cartesian2.Cartesian3();
        var axis2Scratch = new Cartesian2.Cartesian3();
        var quaternionScratch = new Transforms.Quaternion();
        var textureMatrixScratch = new Transforms.Matrix3();
        var tangentRotationScratch = new Transforms.Matrix3();
        var surfaceNormalScratch = new Cartesian2.Cartesian3();

        function createGeometryFromPolygon(polygon, vertexFormat, boundingRectangle, stRotation, projectPointTo2D, normal, tangent, bitangent) {
            var positions = polygon.positions;
            var indices = PolygonPipeline.PolygonPipeline.triangulate(polygon.positions2D, polygon.holes);

            /* If polygon is completely unrenderable, just use the first three vertices */
            if (indices.length < 3) {
                indices = [0, 1, 2];
            }

            var newIndices = IndexDatatype.IndexDatatype.createTypedArray(positions.length, indices.length);
            newIndices.set(indices);

            var textureMatrix = textureMatrixScratch;
            if (stRotation !== 0.0) {
                var rotation = Transforms.Quaternion.fromAxisAngle(normal, stRotation, quaternionScratch);
                textureMatrix = Transforms.Matrix3.fromQuaternion(rotation, textureMatrix);

                if (vertexFormat.tangent || vertexFormat.bitangent) {
                    rotation = Transforms.Quaternion.fromAxisAngle(normal, -stRotation, quaternionScratch);
                    var tangentRotation = Transforms.Matrix3.fromQuaternion(rotation, tangentRotationScratch);

                    tangent = Cartesian2.Cartesian3.normalize(Transforms.Matrix3.multiplyByVector(tangentRotation, tangent, tangent), tangent);
                    if (vertexFormat.bitangent) {
                        bitangent = Cartesian2.Cartesian3.normalize(Cartesian2.Cartesian3.cross(normal, tangent, bitangent), bitangent);
                    }
                }
            } else {
                textureMatrix = Transforms.Matrix3.clone(Transforms.Matrix3.IDENTITY, textureMatrix);
            }

            var stOrigin = textureCoordinatesOrigin;
            if (vertexFormat.st) {
                stOrigin.x = boundingRectangle.x;
                stOrigin.y = boundingRectangle.y;
            }

            var length = positions.length;
            var size = length * 3;
            var flatPositions = new Float64Array(size);
            var normals = vertexFormat.normal ? new Float32Array(size) : undefined;
            var tangents = vertexFormat.tangent ? new Float32Array(size) : undefined;
            var bitangents = vertexFormat.bitangent ? new Float32Array(size) : undefined;
            var textureCoordinates = vertexFormat.st ? new Float32Array(length * 2) : undefined;

            var positionIndex = 0;
            var normalIndex = 0;
            var bitangentIndex = 0;
            var tangentIndex = 0;
            var stIndex = 0;

            for (var i = 0; i < length; i++) {
                var position = positions[i];
                flatPositions[positionIndex++] = position.x;
                flatPositions[positionIndex++] = position.y;
                flatPositions[positionIndex++] = position.z;

                if (vertexFormat.st) {
                    var p = Transforms.Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                    var st = projectPointTo2D(p, stScratch);
                    Cartesian2.Cartesian2.subtract(st, stOrigin, st);

                    var stx = _Math.CesiumMath.clamp(st.x / boundingRectangle.width, 0, 1);
                    var sty = _Math.CesiumMath.clamp(st.y / boundingRectangle.height, 0, 1);
                    textureCoordinates[stIndex++] = stx;
                    textureCoordinates[stIndex++] = sty;
                }

                if (vertexFormat.normal) {
                    normals[normalIndex++] = normal.x;
                    normals[normalIndex++] = normal.y;
                    normals[normalIndex++] = normal.z;
                }

                if (vertexFormat.tangent) {
                    tangents[tangentIndex++] = tangent.x;
                    tangents[tangentIndex++] = tangent.y;
                    tangents[tangentIndex++] = tangent.z;
                }

                if (vertexFormat.bitangent) {
                    bitangents[bitangentIndex++] = bitangent.x;
                    bitangents[bitangentIndex++] = bitangent.y;
                    bitangents[bitangentIndex++] = bitangent.z;
                }
            }

            var attributes = new GeometryAttributes.GeometryAttributes();

            if (vertexFormat.position) {
                attributes.position = new GeometryAttribute.GeometryAttribute({
                    componentDatatype : ComponentDatatype.ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : flatPositions
                });
            }

            if (vertexFormat.normal) {
                attributes.normal = new GeometryAttribute.GeometryAttribute({
                    componentDatatype : ComponentDatatype.ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : normals
                });
            }

            if (vertexFormat.tangent) {
                attributes.tangent = new GeometryAttribute.GeometryAttribute({
                    componentDatatype : ComponentDatatype.ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : tangents
                });
            }

            if (vertexFormat.bitangent) {
                attributes.bitangent = new GeometryAttribute.GeometryAttribute({
                    componentDatatype : ComponentDatatype.ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : bitangents
                });
            }

            if (vertexFormat.st) {
                attributes.st = new GeometryAttribute.GeometryAttribute({
                    componentDatatype : ComponentDatatype.ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : textureCoordinates
                });
            }

            return new GeometryAttribute.Geometry({
                attributes : attributes,
                indices : newIndices,
                primitiveType : GeometryAttribute.PrimitiveType.TRIANGLES
            });
        }

        /**
         * A description of a polygon composed of arbitrary coplanar positions.
         *
         * @alias CoplanarPolygonGeometry
         * @constructor
         *
         * @param {Object} options Object with the following properties:
         * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
         * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
         * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
         * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
         *
         * @example
         * var polygon = new Cesium.CoplanarPolygonGeometry({
         *   positions : Cesium.Cartesian3.fromDegreesArrayHeights([
         *      -90.0, 30.0, 0.0,
         *      -90.0, 30.0, 1000.0,
         *      -80.0, 30.0, 1000.0,
         *      -80.0, 30.0, 0.0
         *   ])
         * });
         * var geometry = Cesium.CoplanarPolygonGeometry.createGeometry(polygon);
         *
         * @see CoplanarPolygonGeometry.createGeometry
         */
        function CoplanarPolygonGeometry(options) {
            options = when.defaultValue(options, when.defaultValue.EMPTY_OBJECT);
            var polygonHierarchy = options.polygonHierarchy;
            //>>includeStart('debug', pragmas.debug);
            Check.Check.defined('options.polygonHierarchy', polygonHierarchy);
            //>>includeEnd('debug');

            var vertexFormat = when.defaultValue(options.vertexFormat, VertexFormat.VertexFormat.DEFAULT);
            this._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat);
            this._polygonHierarchy = polygonHierarchy;
            this._stRotation = when.defaultValue(options.stRotation, 0.0);
            this._ellipsoid = Cartesian2.Ellipsoid.clone(when.defaultValue(options.ellipsoid, Cartesian2.Ellipsoid.WGS84));
            this._workerName = 'createCoplanarPolygonGeometry';

            /**
             * The number of elements used to pack the object into an array.
             * @type {Number}
             */
            this.packedLength = PolygonGeometryLibrary.PolygonGeometryLibrary.computeHierarchyPackedLength(polygonHierarchy) + VertexFormat.VertexFormat.packedLength + Cartesian2.Ellipsoid.packedLength + 2;
        }

        /**
         * A description of a coplanar polygon from an array of positions.
         *
         * @param {Object} options Object with the following properties:
         * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
         * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
         * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
         * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
         * @returns {CoplanarPolygonGeometry}
         *
         * @example
         * // create a polygon from points
         * var polygon = Cesium.CoplanarPolygonGeometry.fromPositions({
         *   positions : Cesium.Cartesian3.fromDegreesArray([
         *     -72.0, 40.0,
         *     -70.0, 35.0,
         *     -75.0, 30.0,
         *     -70.0, 30.0,
         *     -68.0, 40.0
         *   ])
         * });
         * var geometry = Cesium.PolygonGeometry.createGeometry(polygon);
         *
         * @see PolygonGeometry#createGeometry
         */
        CoplanarPolygonGeometry.fromPositions = function(options) {
            options = when.defaultValue(options, when.defaultValue.EMPTY_OBJECT);

            //>>includeStart('debug', pragmas.debug);
            Check.Check.defined('options.positions', options.positions);
            //>>includeEnd('debug');

            var newOptions = {
                polygonHierarchy : {
                    positions : options.positions
                },
                vertexFormat : options.vertexFormat,
                stRotation : options.stRotation,
                ellipsoid : options.ellipsoid
            };
            return new CoplanarPolygonGeometry(newOptions);
        };

        /**
         * Stores the provided instance into the provided array.
         *
         * @param {CoplanarPolygonGeometry} value The value to pack.
         * @param {Number[]} array The array to pack into.
         * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
         *
         * @returns {Number[]} The array that was packed into
         */
        CoplanarPolygonGeometry.pack = function(value, array, startingIndex) {
            //>>includeStart('debug', pragmas.debug);
            Check.Check.typeOf.object('value', value);
            Check.Check.defined('array', array);
            //>>includeEnd('debug');

            startingIndex = when.defaultValue(startingIndex, 0);

            startingIndex = PolygonGeometryLibrary.PolygonGeometryLibrary.packPolygonHierarchy(value._polygonHierarchy, array, startingIndex);

            Cartesian2.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
            startingIndex += Cartesian2.Ellipsoid.packedLength;

            VertexFormat.VertexFormat.pack(value._vertexFormat, array, startingIndex);
            startingIndex += VertexFormat.VertexFormat.packedLength;

            array[startingIndex++] = value._stRotation;
            array[startingIndex] = value.packedLength;

            return array;
        };

        var scratchEllipsoid = Cartesian2.Ellipsoid.clone(Cartesian2.Ellipsoid.UNIT_SPHERE);
        var scratchVertexFormat = new VertexFormat.VertexFormat();
        var scratchOptions = {
            polygonHierarchy : {}
        };
        /**
         * Retrieves an instance from a packed array.
         *
         * @param {Number[]} array The packed array.
         * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
         * @param {CoplanarPolygonGeometry} [result] The object into which to store the result.
         * @returns {CoplanarPolygonGeometry} The modified result parameter or a new CoplanarPolygonGeometry instance if one was not provided.
         */
        CoplanarPolygonGeometry.unpack = function(array, startingIndex, result) {
            //>>includeStart('debug', pragmas.debug);
            Check.Check.defined('array', array);
            //>>includeEnd('debug');

            startingIndex = when.defaultValue(startingIndex, 0);

            var polygonHierarchy = PolygonGeometryLibrary.PolygonGeometryLibrary.unpackPolygonHierarchy(array, startingIndex);
            startingIndex = polygonHierarchy.startingIndex;
            delete polygonHierarchy.startingIndex;

            var ellipsoid = Cartesian2.Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
            startingIndex += Cartesian2.Ellipsoid.packedLength;

            var vertexFormat = VertexFormat.VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
            startingIndex += VertexFormat.VertexFormat.packedLength;

            var stRotation = array[startingIndex++];
            var packedLength = array[startingIndex];

            if (!when.defined(result)) {
                result = new CoplanarPolygonGeometry(scratchOptions);
            }

            result._polygonHierarchy = polygonHierarchy;
            result._ellipsoid = Cartesian2.Ellipsoid.clone(ellipsoid, result._ellipsoid);
            result._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat, result._vertexFormat);
            result._stRotation = stRotation;
            result.packedLength = packedLength;
            return result;
        };

        /**
         * Computes the geometric representation of an arbitrary coplanar polygon, including its vertices, indices, and a bounding sphere.
         *
         * @param {CoplanarPolygonGeometry} polygonGeometry A description of the polygon.
         * @returns {Geometry|undefined} The computed vertices and indices.
         */
        CoplanarPolygonGeometry.createGeometry = function(polygonGeometry) {
            var vertexFormat = polygonGeometry._vertexFormat;
            var polygonHierarchy = polygonGeometry._polygonHierarchy;
            var stRotation = polygonGeometry._stRotation;

            var outerPositions = polygonHierarchy.positions;
            outerPositions = arrayRemoveDuplicates.arrayRemoveDuplicates(outerPositions, Cartesian2.Cartesian3.equalsEpsilon, true);
            if (outerPositions.length < 3) {
                return;
            }

            var normal = scratchNormal;
            var tangent = scratchTangent;
            var bitangent = scratchBitangent;
            var axis1 = axis1Scratch;
            var axis2 = axis2Scratch;

            var validGeometry = CoplanarPolygonGeometryLibrary.CoplanarPolygonGeometryLibrary.computeProjectTo2DArguments(outerPositions, centerScratch, axis1, axis2);
            if (!validGeometry) {
                return undefined;
            }

            normal = Cartesian2.Cartesian3.cross(axis1, axis2, normal);
            normal = Cartesian2.Cartesian3.normalize(normal, normal);

            if (!Cartesian2.Cartesian3.equalsEpsilon(centerScratch, Cartesian2.Cartesian3.ZERO, _Math.CesiumMath.EPSILON6)) {
                var surfaceNormal = polygonGeometry._ellipsoid.geodeticSurfaceNormal(centerScratch, surfaceNormalScratch);
                if (Cartesian2.Cartesian3.dot(normal, surfaceNormal) < 0) {
                    normal = Cartesian2.Cartesian3.negate(normal, normal);
                    axis1 = Cartesian2.Cartesian3.negate(axis1, axis1);
                }
            }

            var projectPoints = CoplanarPolygonGeometryLibrary.CoplanarPolygonGeometryLibrary.createProjectPointsTo2DFunction(centerScratch, axis1, axis2);
            var projectPoint = CoplanarPolygonGeometryLibrary.CoplanarPolygonGeometryLibrary.createProjectPointTo2DFunction(centerScratch, axis1, axis2);

            if (vertexFormat.tangent) {
                tangent = Cartesian2.Cartesian3.clone(axis1, tangent);
            }
            if (vertexFormat.bitangent) {
                bitangent = Cartesian2.Cartesian3.clone(axis2, bitangent);
            }

            var results = PolygonGeometryLibrary.PolygonGeometryLibrary.polygonsFromHierarchy(polygonHierarchy, projectPoints, false);
            var hierarchy = results.hierarchy;
            var polygons = results.polygons;

            if (hierarchy.length === 0) {
                return;
            }
            outerPositions = hierarchy[0].outerRing;

            var boundingSphere = Transforms.BoundingSphere.fromPoints(outerPositions);
            var boundingRectangle = PolygonGeometryLibrary.PolygonGeometryLibrary.computeBoundingRectangle(normal, projectPoint, outerPositions, stRotation, scratchBR);

            var geometries = [];
            for (var i = 0; i < polygons.length; i++) {
                var geometryInstance = new GeometryInstance.GeometryInstance({
                    geometry : createGeometryFromPolygon(polygons[i], vertexFormat, boundingRectangle, stRotation, projectPoint, normal, tangent, bitangent)
                });

                geometries.push(geometryInstance);
            }

            var geometry = GeometryPipeline.GeometryPipeline.combineInstances(geometries)[0];
            geometry.attributes.position.values = new Float64Array(geometry.attributes.position.values);
            geometry.indices = IndexDatatype.IndexDatatype.createTypedArray(geometry.attributes.position.values.length / 3, geometry.indices);

            var attributes = geometry.attributes;
            if (!vertexFormat.position) {
                delete attributes.position;
            }
            return new GeometryAttribute.Geometry({
                attributes : attributes,
                indices : geometry.indices,
                primitiveType : geometry.primitiveType,
                boundingSphere : boundingSphere
            });
        };

    function createCoplanarPolygonGeometry(polygonGeometry, offset) {
            if (when.defined(offset)) {
                polygonGeometry = CoplanarPolygonGeometry.unpack(polygonGeometry, offset);
            }
            return CoplanarPolygonGeometry.createGeometry(polygonGeometry);
        }

    return createCoplanarPolygonGeometry;

});
