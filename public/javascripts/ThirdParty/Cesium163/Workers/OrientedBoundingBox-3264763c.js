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
define(['exports', './when-0488ac89', './Check-78ca6843', './Math-a09b4ca4', './Cartesian2-e22df635', './Transforms-6adeead3', './Plane-25a88d8d', './EllipsoidTangentPlane-72fadcdc'], function (exports, when, Check, _Math, Cartesian2, Transforms, Plane, EllipsoidTangentPlane) { 'use strict';

    /**
         * Creates an instance of an OrientedBoundingBox.
         * An OrientedBoundingBox of some object is a closed and convex cuboid. It can provide a tighter bounding volume than {@link BoundingSphere} or {@link AxisAlignedBoundingBox} in many cases.
         * @alias OrientedBoundingBox
         * @constructor
         *
         * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the box.
         * @param {Matrix3} [halfAxes=Matrix3.ZERO] The three orthogonal half-axes of the bounding box.
         *                                          Equivalently, the transformation matrix, to rotate and scale a 0x0x0
         *                                          cube centered at the origin.
         *
         *
         * @example
         * // Create an OrientedBoundingBox using a transformation matrix, a position where the box will be translated, and a scale.
         * var center = new Cesium.Cartesian3(1.0, 0.0, 0.0);
         * var halfAxes = Cesium.Matrix3.fromScale(new Cesium.Cartesian3(1.0, 3.0, 2.0), new Cesium.Matrix3());
         *
         * var obb = new Cesium.OrientedBoundingBox(center, halfAxes);
         *
         * @see BoundingSphere
         * @see BoundingRectangle
         */
        function OrientedBoundingBox(center, halfAxes) {
            /**
             * The center of the box.
             * @type {Cartesian3}
             * @default {@link Cartesian3.ZERO}
             */
            this.center = Cartesian2.Cartesian3.clone(when.defaultValue(center, Cartesian2.Cartesian3.ZERO));
            /**
             * The transformation matrix, to rotate the box to the right position.
             * @type {Matrix3}
             * @default {@link Matrix3.ZERO}
             */
            this.halfAxes = Transforms.Matrix3.clone(when.defaultValue(halfAxes, Transforms.Matrix3.ZERO));
        }

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        OrientedBoundingBox.packedLength = Cartesian2.Cartesian3.packedLength + Transforms.Matrix3.packedLength;

        /**
         * Stores the provided instance into the provided array.
         *
         * @param {OrientedBoundingBox} value The value to pack.
         * @param {Number[]} array The array to pack into.
         * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
         *
         * @returns {Number[]} The array that was packed into
         */
        OrientedBoundingBox.pack = function(value, array, startingIndex) {
            //>>includeStart('debug', pragmas.debug);
            Check.Check.typeOf.object('value', value);
            Check.Check.defined('array', array);
            //>>includeEnd('debug');

            startingIndex = when.defaultValue(startingIndex, 0);

            Cartesian2.Cartesian3.pack(value.center, array, startingIndex);
            Transforms.Matrix3.pack(value.halfAxes, array, startingIndex + Cartesian2.Cartesian3.packedLength);

            return array;
        };

        /**
         * Retrieves an instance from a packed array.
         *
         * @param {Number[]} array The packed array.
         * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
         * @param {OrientedBoundingBox} [result] The object into which to store the result.
         * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
         */
        OrientedBoundingBox.unpack = function(array, startingIndex, result) {
            //>>includeStart('debug', pragmas.debug);
            Check.Check.defined('array', array);
            //>>includeEnd('debug');

            startingIndex = when.defaultValue(startingIndex, 0);

            if (!when.defined(result)) {
                result = new OrientedBoundingBox();
            }

            Cartesian2.Cartesian3.unpack(array, startingIndex, result.center);
            Transforms.Matrix3.unpack(array, startingIndex + Cartesian2.Cartesian3.packedLength, result.halfAxes);
            return result;
        };

        var scratchCartesian1 = new Cartesian2.Cartesian3();
        var scratchCartesian2 = new Cartesian2.Cartesian3();
        var scratchCartesian3 = new Cartesian2.Cartesian3();
        var scratchCartesian4 = new Cartesian2.Cartesian3();
        var scratchCartesian5 = new Cartesian2.Cartesian3();
        var scratchCartesian6 = new Cartesian2.Cartesian3();
        var scratchCovarianceResult = new Transforms.Matrix3();
        var scratchEigenResult = {
            unitary : new Transforms.Matrix3(),
            diagonal : new Transforms.Matrix3()
        };

        /**
         * Computes an instance of an OrientedBoundingBox of the given positions.
         * This is an implementation of Stefan Gottschalk's Collision Queries using Oriented Bounding Boxes solution (PHD thesis).
         * Reference: http://gamma.cs.unc.edu/users/gottschalk/main.pdf
         *
         * @param {Cartesian3[]} [positions] List of {@link Cartesian3} points that the bounding box will enclose.
         * @param {OrientedBoundingBox} [result] The object onto which to store the result.
         * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
         *
         * @example
         * // Compute an object oriented bounding box enclosing two points.
         * var box = Cesium.OrientedBoundingBox.fromPoints([new Cesium.Cartesian3(2, 0, 0), new Cesium.Cartesian3(-2, 0, 0)]);
         */
        OrientedBoundingBox.fromPoints = function(positions, result) {
            if (!when.defined(result)) {
                result = new OrientedBoundingBox();
            }

            if (!when.defined(positions) || positions.length === 0) {
                result.halfAxes = Transforms.Matrix3.ZERO;
                result.center = Cartesian2.Cartesian3.ZERO;
                return result;
            }

            var i;
            var length = positions.length;

            var meanPoint = Cartesian2.Cartesian3.clone(positions[0], scratchCartesian1);
            for (i = 1; i < length; i++) {
                Cartesian2.Cartesian3.add(meanPoint, positions[i], meanPoint);
            }
            var invLength = 1.0 / length;
            Cartesian2.Cartesian3.multiplyByScalar(meanPoint, invLength, meanPoint);

            var exx = 0.0;
            var exy = 0.0;
            var exz = 0.0;
            var eyy = 0.0;
            var eyz = 0.0;
            var ezz = 0.0;
            var p;

            for (i = 0; i < length; i++) {
                p = Cartesian2.Cartesian3.subtract(positions[i], meanPoint, scratchCartesian2);
                exx += p.x * p.x;
                exy += p.x * p.y;
                exz += p.x * p.z;
                eyy += p.y * p.y;
                eyz += p.y * p.z;
                ezz += p.z * p.z;
            }

            exx *= invLength;
            exy *= invLength;
            exz *= invLength;
            eyy *= invLength;
            eyz *= invLength;
            ezz *= invLength;

            var covarianceMatrix = scratchCovarianceResult;
            covarianceMatrix[0] = exx;
            covarianceMatrix[1] = exy;
            covarianceMatrix[2] = exz;
            covarianceMatrix[3] = exy;
            covarianceMatrix[4] = eyy;
            covarianceMatrix[5] = eyz;
            covarianceMatrix[6] = exz;
            covarianceMatrix[7] = eyz;
            covarianceMatrix[8] = ezz;

            var eigenDecomposition = Transforms.Matrix3.computeEigenDecomposition(covarianceMatrix, scratchEigenResult);
            var rotation = Transforms.Matrix3.clone(eigenDecomposition.unitary, result.halfAxes);

            var v1 = Transforms.Matrix3.getColumn(rotation, 0, scratchCartesian4);
            var v2 = Transforms.Matrix3.getColumn(rotation, 1, scratchCartesian5);
            var v3 = Transforms.Matrix3.getColumn(rotation, 2, scratchCartesian6);

            var u1 = -Number.MAX_VALUE;
            var u2 = -Number.MAX_VALUE;
            var u3 = -Number.MAX_VALUE;
            var l1 = Number.MAX_VALUE;
            var l2 = Number.MAX_VALUE;
            var l3 = Number.MAX_VALUE;

            for (i = 0; i < length; i++) {
                p = positions[i];
                u1 = Math.max(Cartesian2.Cartesian3.dot(v1, p), u1);
                u2 = Math.max(Cartesian2.Cartesian3.dot(v2, p), u2);
                u3 = Math.max(Cartesian2.Cartesian3.dot(v3, p), u3);

                l1 = Math.min(Cartesian2.Cartesian3.dot(v1, p), l1);
                l2 = Math.min(Cartesian2.Cartesian3.dot(v2, p), l2);
                l3 = Math.min(Cartesian2.Cartesian3.dot(v3, p), l3);
            }

            v1 = Cartesian2.Cartesian3.multiplyByScalar(v1, 0.5 * (l1 + u1), v1);
            v2 = Cartesian2.Cartesian3.multiplyByScalar(v2, 0.5 * (l2 + u2), v2);
            v3 = Cartesian2.Cartesian3.multiplyByScalar(v3, 0.5 * (l3 + u3), v3);

            var center = Cartesian2.Cartesian3.add(v1, v2, result.center);
            Cartesian2.Cartesian3.add(center, v3, center);

            var scale = scratchCartesian3;
            scale.x = u1 - l1;
            scale.y = u2 - l2;
            scale.z = u3 - l3;
            Cartesian2.Cartesian3.multiplyByScalar(scale, 0.5, scale);
            Transforms.Matrix3.multiplyByScale(result.halfAxes, scale, result.halfAxes);

            return result;
        };

        var scratchOffset = new Cartesian2.Cartesian3();
        var scratchScale = new Cartesian2.Cartesian3();
        function fromTangentPlaneExtents(tangentPlane, minimumX, maximumX, minimumY, maximumY, minimumZ, maximumZ, result) {
            //>>includeStart('debug', pragmas.debug);
            if (!when.defined(minimumX) ||
                !when.defined(maximumX) ||
                !when.defined(minimumY) ||
                !when.defined(maximumY) ||
                !when.defined(minimumZ) ||
                !when.defined(maximumZ)) {
                throw new Check.DeveloperError('all extents (minimum/maximum X/Y/Z) are required.');
            }
            //>>includeEnd('debug');

            if (!when.defined(result)) {
                result = new OrientedBoundingBox();
            }

            var halfAxes = result.halfAxes;
            Transforms.Matrix3.setColumn(halfAxes, 0, tangentPlane.xAxis, halfAxes);
            Transforms.Matrix3.setColumn(halfAxes, 1, tangentPlane.yAxis, halfAxes);
            Transforms.Matrix3.setColumn(halfAxes, 2, tangentPlane.zAxis, halfAxes);

            var centerOffset = scratchOffset;
            centerOffset.x = (minimumX + maximumX) / 2.0;
            centerOffset.y = (minimumY + maximumY) / 2.0;
            centerOffset.z = (minimumZ + maximumZ) / 2.0;

            var scale = scratchScale;
            scale.x = (maximumX - minimumX) / 2.0;
            scale.y = (maximumY - minimumY) / 2.0;
            scale.z = (maximumZ - minimumZ) / 2.0;

            var center = result.center;
            centerOffset = Transforms.Matrix3.multiplyByVector(halfAxes, centerOffset, centerOffset);
            Cartesian2.Cartesian3.add(tangentPlane.origin, centerOffset, center);
            Transforms.Matrix3.multiplyByScale(halfAxes, scale, halfAxes);

            return result;
        }

        var scratchRectangleCenterCartographic = new Cartesian2.Cartographic();
        var scratchRectangleCenter = new Cartesian2.Cartesian3();
        var perimeterCartographicScratch = [new Cartesian2.Cartographic(), new Cartesian2.Cartographic(), new Cartesian2.Cartographic(), new Cartesian2.Cartographic(), new Cartesian2.Cartographic(), new Cartesian2.Cartographic(), new Cartesian2.Cartographic(), new Cartesian2.Cartographic()];
        var perimeterCartesianScratch = [new Cartesian2.Cartesian3(), new Cartesian2.Cartesian3(), new Cartesian2.Cartesian3(), new Cartesian2.Cartesian3(), new Cartesian2.Cartesian3(), new Cartesian2.Cartesian3(), new Cartesian2.Cartesian3(), new Cartesian2.Cartesian3()];
        var perimeterProjectedScratch = [new Cartesian2.Cartesian2(), new Cartesian2.Cartesian2(), new Cartesian2.Cartesian2(), new Cartesian2.Cartesian2(), new Cartesian2.Cartesian2(), new Cartesian2.Cartesian2(), new Cartesian2.Cartesian2(), new Cartesian2.Cartesian2()];
        /**
         * Computes an OrientedBoundingBox that bounds a {@link Rectangle} on the surface of an {@link Ellipsoid}.
         * There are no guarantees about the orientation of the bounding box.
         *
         * @param {Rectangle} rectangle The cartographic rectangle on the surface of the ellipsoid.
         * @param {Number} [minimumHeight=0.0] The minimum height (elevation) within the tile.
         * @param {Number} [maximumHeight=0.0] The maximum height (elevation) within the tile.
         * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle is defined.
         * @param {OrientedBoundingBox} [result] The object onto which to store the result.
         * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided.
         *
         * @exception {DeveloperError} rectangle.width must be between 0 and pi.
         * @exception {DeveloperError} rectangle.height must be between 0 and pi.
         * @exception {DeveloperError} ellipsoid must be an ellipsoid of revolution (<code>radii.x == radii.y</code>)
         */
        OrientedBoundingBox.fromRectangle = function(rectangle, minimumHeight, maximumHeight, ellipsoid, result) {
            //>>includeStart('debug', pragmas.debug);
            if (!when.defined(rectangle)) {
                throw new Check.DeveloperError('rectangle is required');
            }
            if (rectangle.width < 0.0 || rectangle.width > _Math.CesiumMath.TWO_PI) {
                throw new Check.DeveloperError('Rectangle width must be between 0 and 2*pi');
            }
            if (rectangle.height < 0.0 || rectangle.height > _Math.CesiumMath.PI) {
                throw new Check.DeveloperError('Rectangle height must be between 0 and pi');
            }
            if (when.defined(ellipsoid) && !_Math.CesiumMath.equalsEpsilon(ellipsoid.radii.x, ellipsoid.radii.y, _Math.CesiumMath.EPSILON15)) {
                throw new Check.DeveloperError('Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)');
            }
            //>>includeEnd('debug');

            minimumHeight = when.defaultValue(minimumHeight, 0.0);
            maximumHeight = when.defaultValue(maximumHeight, 0.0);
            ellipsoid = when.defaultValue(ellipsoid, Cartesian2.Ellipsoid.WGS84);

            // The bounding box will be aligned with the tangent plane at the center of the rectangle.
            var tangentPointCartographic = Cartesian2.Rectangle.center(rectangle, scratchRectangleCenterCartographic);
            var tangentPoint = ellipsoid.cartographicToCartesian(tangentPointCartographic, scratchRectangleCenter);
            var tangentPlane = new EllipsoidTangentPlane.EllipsoidTangentPlane(tangentPoint, ellipsoid);
            var plane = tangentPlane.plane;

            // Corner arrangement:
            //          N/+y
            //      [0] [1] [2]
            // W/-x [7]     [3] E/+x
            //      [6] [5] [4]
            //          S/-y
            // "C" refers to the central lat/long, which by default aligns with the tangent point (above).
            // If the rectangle spans the equator, CW and CE are instead aligned with the equator.
            var perimeterNW = perimeterCartographicScratch[0];
            var perimeterNC = perimeterCartographicScratch[1];
            var perimeterNE = perimeterCartographicScratch[2];
            var perimeterCE = perimeterCartographicScratch[3];
            var perimeterSE = perimeterCartographicScratch[4];
            var perimeterSC = perimeterCartographicScratch[5];
            var perimeterSW = perimeterCartographicScratch[6];
            var perimeterCW = perimeterCartographicScratch[7];

            var lonCenter = tangentPointCartographic.longitude;
            var latCenter = (rectangle.south < 0.0 && rectangle.north > 0.0) ? 0.0 : tangentPointCartographic.latitude;
            perimeterSW.latitude = perimeterSC.latitude = perimeterSE.latitude = rectangle.south;
            perimeterCW.latitude = perimeterCE.latitude = latCenter;
            perimeterNW.latitude = perimeterNC.latitude = perimeterNE.latitude = rectangle.north;
            perimeterSW.longitude = perimeterCW.longitude = perimeterNW.longitude = rectangle.west;
            perimeterSC.longitude = perimeterNC.longitude = lonCenter;
            perimeterSE.longitude = perimeterCE.longitude = perimeterNE.longitude = rectangle.east;

            // Compute XY extents using the rectangle at maximum height
            perimeterNE.height = perimeterNC.height = perimeterNW.height = perimeterCW.height = perimeterSW.height = perimeterSC.height = perimeterSE.height = perimeterCE.height = maximumHeight;

            ellipsoid.cartographicArrayToCartesianArray(perimeterCartographicScratch, perimeterCartesianScratch);
            tangentPlane.projectPointsToNearestOnPlane(perimeterCartesianScratch, perimeterProjectedScratch);
            // See the `perimeterXX` definitions above for what these are
            var minX = Math.min(perimeterProjectedScratch[6].x, perimeterProjectedScratch[7].x, perimeterProjectedScratch[0].x);
            var maxX = Math.max(perimeterProjectedScratch[2].x, perimeterProjectedScratch[3].x, perimeterProjectedScratch[4].x);
            var minY = Math.min(perimeterProjectedScratch[4].y, perimeterProjectedScratch[5].y, perimeterProjectedScratch[6].y);
            var maxY = Math.max(perimeterProjectedScratch[0].y, perimeterProjectedScratch[1].y, perimeterProjectedScratch[2].y);

            // Compute minimum Z using the rectangle at minimum height
            perimeterNE.height = perimeterNW.height = perimeterSE.height = perimeterSW.height = minimumHeight;
            ellipsoid.cartographicArrayToCartesianArray(perimeterCartographicScratch, perimeterCartesianScratch);
            var minZ = Math.min(Plane.Plane.getPointDistance(plane, perimeterCartesianScratch[0]),
                                Plane.Plane.getPointDistance(plane, perimeterCartesianScratch[2]),
                                Plane.Plane.getPointDistance(plane, perimeterCartesianScratch[4]),
                                Plane.Plane.getPointDistance(plane, perimeterCartesianScratch[6]));
            var maxZ = maximumHeight;  // Since the tangent plane touches the surface at height = 0, this is okay

            return fromTangentPlaneExtents(tangentPlane, minX, maxX, minY, maxY, minZ, maxZ, result);
        };

        /**
         * Duplicates a OrientedBoundingBox instance.
         *
         * @param {OrientedBoundingBox} box The bounding box to duplicate.
         * @param {OrientedBoundingBox} [result] The object onto which to store the result.
         * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided. (Returns undefined if box is undefined)
         */
        OrientedBoundingBox.clone = function(box, result) {
            if (!when.defined(box)) {
                return undefined;
            }

            if (!when.defined(result)) {
                return new OrientedBoundingBox(box.center, box.halfAxes);
            }

            Cartesian2.Cartesian3.clone(box.center, result.center);
            Transforms.Matrix3.clone(box.halfAxes, result.halfAxes);

            return result;
        };

        /**
         * Determines which side of a plane the oriented bounding box is located.
         *
         * @param {OrientedBoundingBox} box The oriented bounding box to test.
         * @param {Plane} plane The plane to test against.
         * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
         *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
         *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
         *                      intersects the plane.
         */
        OrientedBoundingBox.intersectPlane = function(box, plane) {
            //>>includeStart('debug', pragmas.debug);
            if (!when.defined(box)) {
                throw new Check.DeveloperError('box is required.');
            }

            if (!when.defined(plane)) {
                throw new Check.DeveloperError('plane is required.');
            }
            //>>includeEnd('debug');

            var center = box.center;
            var normal = plane.normal;
            var halfAxes = box.halfAxes;
            var normalX = normal.x, normalY = normal.y, normalZ = normal.z;
            // plane is used as if it is its normal; the first three components are assumed to be normalized
            var radEffective = Math.abs(normalX * halfAxes[Transforms.Matrix3.COLUMN0ROW0] + normalY * halfAxes[Transforms.Matrix3.COLUMN0ROW1] + normalZ * halfAxes[Transforms.Matrix3.COLUMN0ROW2]) +
                               Math.abs(normalX * halfAxes[Transforms.Matrix3.COLUMN1ROW0] + normalY * halfAxes[Transforms.Matrix3.COLUMN1ROW1] + normalZ * halfAxes[Transforms.Matrix3.COLUMN1ROW2]) +
                               Math.abs(normalX * halfAxes[Transforms.Matrix3.COLUMN2ROW0] + normalY * halfAxes[Transforms.Matrix3.COLUMN2ROW1] + normalZ * halfAxes[Transforms.Matrix3.COLUMN2ROW2]);
            var distanceToPlane = Cartesian2.Cartesian3.dot(normal, center) + plane.distance;

            if (distanceToPlane <= -radEffective) {
                // The entire box is on the negative side of the plane normal
                return Transforms.Intersect.OUTSIDE;
            } else if (distanceToPlane >= radEffective) {
                // The entire box is on the positive side of the plane normal
                return Transforms.Intersect.INSIDE;
            }
            return Transforms.Intersect.INTERSECTING;
        };

        var scratchCartesianU = new Cartesian2.Cartesian3();
        var scratchCartesianV = new Cartesian2.Cartesian3();
        var scratchCartesianW = new Cartesian2.Cartesian3();
        var scratchPPrime = new Cartesian2.Cartesian3();

        /**
         * Computes the estimated distance squared from the closest point on a bounding box to a point.
         *
         * @param {OrientedBoundingBox} box The box.
         * @param {Cartesian3} cartesian The point
         * @returns {Number} The estimated distance squared from the bounding sphere to the point.
         *
         * @example
         * // Sort bounding boxes from back to front
         * boxes.sort(function(a, b) {
         *     return Cesium.OrientedBoundingBox.distanceSquaredTo(b, camera.positionWC) - Cesium.OrientedBoundingBox.distanceSquaredTo(a, camera.positionWC);
         * });
         */
        OrientedBoundingBox.distanceSquaredTo = function(box, cartesian) {
            // See Geometric Tools for Computer Graphics 10.4.2

            //>>includeStart('debug', pragmas.debug);
            if (!when.defined(box)) {
                throw new Check.DeveloperError('box is required.');
            }
            if (!when.defined(cartesian)) {
                throw new Check.DeveloperError('cartesian is required.');
            }
            //>>includeEnd('debug');

            var offset = Cartesian2.Cartesian3.subtract(cartesian, box.center, scratchOffset);

            var halfAxes = box.halfAxes;
            var u = Transforms.Matrix3.getColumn(halfAxes, 0, scratchCartesianU);
            var v = Transforms.Matrix3.getColumn(halfAxes, 1, scratchCartesianV);
            var w = Transforms.Matrix3.getColumn(halfAxes, 2, scratchCartesianW);

            var uHalf = Cartesian2.Cartesian3.magnitude(u);
            var vHalf = Cartesian2.Cartesian3.magnitude(v);
            var wHalf = Cartesian2.Cartesian3.magnitude(w);

            Cartesian2.Cartesian3.normalize(u, u);
            Cartesian2.Cartesian3.normalize(v, v);
            Cartesian2.Cartesian3.normalize(w, w);

            var pPrime = scratchPPrime;
            pPrime.x = Cartesian2.Cartesian3.dot(offset, u);
            pPrime.y = Cartesian2.Cartesian3.dot(offset, v);
            pPrime.z = Cartesian2.Cartesian3.dot(offset, w);

            var distanceSquared = 0.0;
            var d;

            if (pPrime.x < -uHalf) {
                d = pPrime.x + uHalf;
                distanceSquared += d * d;
            } else if (pPrime.x > uHalf) {
                d = pPrime.x - uHalf;
                distanceSquared += d * d;
            }

            if (pPrime.y < -vHalf) {
                d = pPrime.y + vHalf;
                distanceSquared += d * d;
            } else if (pPrime.y > vHalf) {
                d = pPrime.y - vHalf;
                distanceSquared += d * d;
            }

            if (pPrime.z < -wHalf) {
                d = pPrime.z + wHalf;
                distanceSquared += d * d;
            } else if (pPrime.z > wHalf) {
                d = pPrime.z - wHalf;
                distanceSquared += d * d;
            }

            return distanceSquared;
        };

        var scratchCorner = new Cartesian2.Cartesian3();
        var scratchToCenter = new Cartesian2.Cartesian3();

        /**
         * The distances calculated by the vector from the center of the bounding box to position projected onto direction.
         * <br>
         * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
         * closest and farthest planes from position that intersect the bounding box.
         *
         * @param {OrientedBoundingBox} box The bounding box to calculate the distance to.
         * @param {Cartesian3} position The position to calculate the distance from.
         * @param {Cartesian3} direction The direction from position.
         * @param {Interval} [result] A Interval to store the nearest and farthest distances.
         * @returns {Interval} The nearest and farthest distances on the bounding box from position in direction.
         */
        OrientedBoundingBox.computePlaneDistances = function(box, position, direction, result) {
            //>>includeStart('debug', pragmas.debug);
            if (!when.defined(box)) {
                throw new Check.DeveloperError('box is required.');
            }

            if (!when.defined(position)) {
                throw new Check.DeveloperError('position is required.');
            }

            if (!when.defined(direction)) {
                throw new Check.DeveloperError('direction is required.');
            }
            //>>includeEnd('debug');

            if (!when.defined(result)) {
                result = new Transforms.Interval();
            }

            var minDist = Number.POSITIVE_INFINITY;
            var maxDist = Number.NEGATIVE_INFINITY;

            var center = box.center;
            var halfAxes = box.halfAxes;

            var u = Transforms.Matrix3.getColumn(halfAxes, 0, scratchCartesianU);
            var v = Transforms.Matrix3.getColumn(halfAxes, 1, scratchCartesianV);
            var w = Transforms.Matrix3.getColumn(halfAxes, 2, scratchCartesianW);

            // project first corner
            var corner = Cartesian2.Cartesian3.add(u, v, scratchCorner);
            Cartesian2.Cartesian3.add(corner, w, corner);
            Cartesian2.Cartesian3.add(corner, center, corner);

            var toCenter = Cartesian2.Cartesian3.subtract(corner, position, scratchToCenter);
            var mag = Cartesian2.Cartesian3.dot(direction, toCenter);

            minDist = Math.min(mag, minDist);
            maxDist = Math.max(mag, maxDist);

            // project second corner
            Cartesian2.Cartesian3.add(center, u, corner);
            Cartesian2.Cartesian3.add(corner, v, corner);
            Cartesian2.Cartesian3.subtract(corner, w, corner);

            Cartesian2.Cartesian3.subtract(corner, position, toCenter);
            mag = Cartesian2.Cartesian3.dot(direction, toCenter);

            minDist = Math.min(mag, minDist);
            maxDist = Math.max(mag, maxDist);

            // project third corner
            Cartesian2.Cartesian3.add(center, u, corner);
            Cartesian2.Cartesian3.subtract(corner, v, corner);
            Cartesian2.Cartesian3.add(corner, w, corner);

            Cartesian2.Cartesian3.subtract(corner, position, toCenter);
            mag = Cartesian2.Cartesian3.dot(direction, toCenter);

            minDist = Math.min(mag, minDist);
            maxDist = Math.max(mag, maxDist);

            // project fourth corner
            Cartesian2.Cartesian3.add(center, u, corner);
            Cartesian2.Cartesian3.subtract(corner, v, corner);
            Cartesian2.Cartesian3.subtract(corner, w, corner);

            Cartesian2.Cartesian3.subtract(corner, position, toCenter);
            mag = Cartesian2.Cartesian3.dot(direction, toCenter);

            minDist = Math.min(mag, minDist);
            maxDist = Math.max(mag, maxDist);

            // project fifth corner
            Cartesian2.Cartesian3.subtract(center, u, corner);
            Cartesian2.Cartesian3.add(corner, v, corner);
            Cartesian2.Cartesian3.add(corner, w, corner);

            Cartesian2.Cartesian3.subtract(corner, position, toCenter);
            mag = Cartesian2.Cartesian3.dot(direction, toCenter);

            minDist = Math.min(mag, minDist);
            maxDist = Math.max(mag, maxDist);

            // project sixth corner
            Cartesian2.Cartesian3.subtract(center, u, corner);
            Cartesian2.Cartesian3.add(corner, v, corner);
            Cartesian2.Cartesian3.subtract(corner, w, corner);

            Cartesian2.Cartesian3.subtract(corner, position, toCenter);
            mag = Cartesian2.Cartesian3.dot(direction, toCenter);

            minDist = Math.min(mag, minDist);
            maxDist = Math.max(mag, maxDist);

            // project seventh corner
            Cartesian2.Cartesian3.subtract(center, u, corner);
            Cartesian2.Cartesian3.subtract(corner, v, corner);
            Cartesian2.Cartesian3.add(corner, w, corner);

            Cartesian2.Cartesian3.subtract(corner, position, toCenter);
            mag = Cartesian2.Cartesian3.dot(direction, toCenter);

            minDist = Math.min(mag, minDist);
            maxDist = Math.max(mag, maxDist);

            // project eighth corner
            Cartesian2.Cartesian3.subtract(center, u, corner);
            Cartesian2.Cartesian3.subtract(corner, v, corner);
            Cartesian2.Cartesian3.subtract(corner, w, corner);

            Cartesian2.Cartesian3.subtract(corner, position, toCenter);
            mag = Cartesian2.Cartesian3.dot(direction, toCenter);

            minDist = Math.min(mag, minDist);
            maxDist = Math.max(mag, maxDist);

            result.start = minDist;
            result.stop = maxDist;
            return result;
        };

        var scratchBoundingSphere = new Transforms.BoundingSphere();

        /**
         * Determines whether or not a bounding box is hidden from view by the occluder.
         *
         * @param {OrientedBoundingBox} box The bounding box surrounding the occludee object.
         * @param {Occluder} occluder The occluder.
         * @returns {Boolean} <code>true</code> if the box is not visible; otherwise <code>false</code>.
         */
        OrientedBoundingBox.isOccluded = function(box, occluder) {
            //>>includeStart('debug', pragmas.debug);
            if (!when.defined(box)) {
                throw new Check.DeveloperError('box is required.');
            }
            if (!when.defined(occluder)) {
                throw new Check.DeveloperError('occluder is required.');
            }
            //>>includeEnd('debug');

            var sphere = Transforms.BoundingSphere.fromOrientedBoundingBox(box, scratchBoundingSphere);

            return !occluder.isBoundingSphereVisible(sphere);
        };

        /**
         * Determines which side of a plane the oriented bounding box is located.
         *
         * @param {Plane} plane The plane to test against.
         * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
         *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
         *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
         *                      intersects the plane.
         */
        OrientedBoundingBox.prototype.intersectPlane = function(plane) {
            return OrientedBoundingBox.intersectPlane(this, plane);
        };

        /**
         * Computes the estimated distance squared from the closest point on a bounding box to a point.
         *
         * @param {Cartesian3} cartesian The point
         * @returns {Number} The estimated distance squared from the bounding sphere to the point.
         *
         * @example
         * // Sort bounding boxes from back to front
         * boxes.sort(function(a, b) {
         *     return b.distanceSquaredTo(camera.positionWC) - a.distanceSquaredTo(camera.positionWC);
         * });
         */
        OrientedBoundingBox.prototype.distanceSquaredTo = function(cartesian) {
            return OrientedBoundingBox.distanceSquaredTo(this, cartesian);
        };

        /**
         * The distances calculated by the vector from the center of the bounding box to position projected onto direction.
         * <br>
         * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
         * closest and farthest planes from position that intersect the bounding box.
         *
         * @param {Cartesian3} position The position to calculate the distance from.
         * @param {Cartesian3} direction The direction from position.
         * @param {Interval} [result] A Interval to store the nearest and farthest distances.
         * @returns {Interval} The nearest and farthest distances on the bounding box from position in direction.
         */
        OrientedBoundingBox.prototype.computePlaneDistances = function(position, direction, result) {
            return OrientedBoundingBox.computePlaneDistances(this, position, direction, result);
        };

        /**
         * Determines whether or not a bounding box is hidden from view by the occluder.
         *
         * @param {Occluder} occluder The occluder.
         * @returns {Boolean} <code>true</code> if the sphere is not visible; otherwise <code>false</code>.
         */
        OrientedBoundingBox.prototype.isOccluded = function(occluder) {
            return OrientedBoundingBox.isOccluded(this, occluder);
        };

        /**
         * Compares the provided OrientedBoundingBox componentwise and returns
         * <code>true</code> if they are equal, <code>false</code> otherwise.
         *
         * @param {OrientedBoundingBox} left The first OrientedBoundingBox.
         * @param {OrientedBoundingBox} right The second OrientedBoundingBox.
         * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
         */
        OrientedBoundingBox.equals = function(left, right) {
            return (left === right) ||
                    ((when.defined(left)) &&
                     (when.defined(right)) &&
                     Cartesian2.Cartesian3.equals(left.center, right.center) &&
                     Transforms.Matrix3.equals(left.halfAxes, right.halfAxes));
        };

        /**
         * Duplicates this OrientedBoundingBox instance.
         *
         * @param {OrientedBoundingBox} [result] The object onto which to store the result.
         * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
         */
        OrientedBoundingBox.prototype.clone = function(result) {
            return OrientedBoundingBox.clone(this, result);
        };

        /**
         * Compares this OrientedBoundingBox against the provided OrientedBoundingBox componentwise and returns
         * <code>true</code> if they are equal, <code>false</code> otherwise.
         *
         * @param {OrientedBoundingBox} [right] The right hand side OrientedBoundingBox.
         * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
         */
        OrientedBoundingBox.prototype.equals = function(right) {
            return OrientedBoundingBox.equals(this, right);
        };

    exports.OrientedBoundingBox = OrientedBoundingBox;

});
