import {Box, Grid, Skeleton} from "@mui/material";
import CustomCard from "@/components/customs/custom-card.tsx";

const ViewStoreLoading = () => {
    return (
        <Box>
            {/* Details Skeleton */}
            <CustomCard>
                <Grid container spacing={3}>
                    {Array.from(new Array(4)).map((_, index) => (
                        <Grid size={{xs: 12, sm: 6}} key={index}>
                            <Skeleton variant="text" width="40%"/>
                            <Skeleton variant="text" width="40%"/>
                            <Skeleton variant="text" width="40%"/>
                            <Skeleton variant="text" width="70%" height={28}/>
                        </Grid>
                    ))}
                </Grid>
            </CustomCard>
        </Box>
    );
};

export default ViewStoreLoading;
