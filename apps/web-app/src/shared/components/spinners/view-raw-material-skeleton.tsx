import {Box, CardContent, Grid, Skeleton} from "@mui/material";
import CustomCard from "@/components/customs/custom-card.tsx";

const ViewRawMaterialSkeleton = () => {
    return (
        <Box>
            <CustomCard>
                <CardContent>
                    <Skeleton variant="text" width="40%" height={32} sx={{mb: 2}}/>
                    <Grid container spacing={2}>
                        {[...Array(6)].map((_, index) => (
                            <Grid key={index} size={{xs: 12, sm: 6}}>
                                <Skeleton variant="text" width="50%" height={20}/>
                                <Skeleton variant="text" width="70%" height={24}/>
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </CustomCard>
            <CustomCard sx={{mt: 2}}>
                <CardContent>
                    <Skeleton variant="text" width="40%" height={32} sx={{mb: 2}}/>
                    <Grid container spacing={2}>
                        {[...Array(2)].map((_, index) => (
                            <Grid key={index} size={{xs: 12, sm: 6}}>
                                <Skeleton variant="text" width="50%" height={20}/>
                                <Skeleton variant="text" width="70%" height={24}/>
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </CustomCard>
        </Box>
    );
};

export default ViewRawMaterialSkeleton;
