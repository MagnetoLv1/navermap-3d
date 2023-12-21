const toDegree = (radian: number) => {
    return (radian * 180) / Math.PI;
};

const toRadian = (degree: number) => {
    return (degree * Math.PI) / 180;
};

export default {
    toDegree,
    toRadian
};
