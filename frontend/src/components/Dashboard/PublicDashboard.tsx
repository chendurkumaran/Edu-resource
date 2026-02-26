import HomeBanner from '../Home/HomeBanner';
import CourseList from '../Courses/CourseList';

/**
 * Shown at the root "/" route when the user is NOT logged in.
 * Displays the hero banner + explore categories, followed by the public course list.
 */
const PublicDashboard = () => {
    return (
        <div className="space-y-10">
            <HomeBanner />
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Browse All Courses</h2>
                <CourseList />
            </div>
        </div>
    );
};

export default PublicDashboard;
